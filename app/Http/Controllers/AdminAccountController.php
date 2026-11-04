<?php

namespace App\Http\Controllers;

use App\Models\Admin;
use App\Support\Audit;
use App\Support\FieldRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminAccountController extends Controller
{
    private function view(Admin $account, Admin $actor): array
    {
        return [...$account->only('id', 'email', 'name', 'role', 'isActive', 'mustChangePassword', 'tempPasswordExpiresAt', 'lastLoginAt'), 'isSelf' => $account->id === $actor->id, 'googleConnected' => $account->googleSubject !== null];
    }

    private function confirm(Request $request, string $email): void
    {
        $actor = $request->user();
        $key = 'account-confirm:'.$actor->id;
        abort_if(RateLimiter::tooManyAttempts($key, 5), 429, 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.');
        if (mb_strtolower(trim((string) $request->input('confirmEmail'))) !== mb_strtolower($email) ||
            ! password_verify((string) $request->input('password'), $actor->passwordHash)) {
            RateLimiter::hit($key, 900);
            throw ValidationException::withMessages(['password' => 'Email konfirmasi atau password Anda tidak sesuai.']);
        }
        RateLimiter::clear($key);
    }

    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);

        return response()->json(Admin::orderByDesc('isActive')->orderBy('role')->orderBy('name')->get()->map(fn ($account) => $this->view($account, $request->user())));
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate(['name' => ['required', 'string', 'max:80', FieldRules::rule('person')], 'email' => 'required|email|max:254|unique:Admin,email', 'role' => 'required|in:ADMIN,SUPERADMIN']);
        if ($data['role'] === 'SUPERADMIN') {
            $this->confirm($request, $data['email']);
        }
        $password = Str::password(20);
        $account = DB::transaction(function () use ($request, $data, $password) {
            $account = Admin::create([...$data, 'passwordHash' => Hash::make($password),
                'isActive' => true, 'mustChangePassword' => true, 'sessionVersion' => 0, 'tempPasswordExpiresAt' => now()->addHours(72)]);
            Audit::record($request->user(), 'create', 'accounts', $account->email);

            return $account;
        });

        return response()->json(['account' => $this->view($account, $request->user()), 'temporaryPassword' => $password, 'temporaryPasswordValidHours' => 72], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        return $this->mutate($request, $id, false);
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        return $this->mutate($request, $id, true);
    }

    private function mutate(Request $request, string $id, bool $delete): JsonResponse
    {
        abort_unless($request->user()->role === 'SUPERADMIN', 403);

        return DB::transaction(function () use ($request, $id, $delete) {
            $accounts = Admin::orderBy('id')->lockForUpdate()->get();
            $target = $accounts->firstWhere('id', $id);
            abort_unless($target, 404);
            $actor = $accounts->firstWhere('id', $request->user()->id);
            abort_unless($actor && $actor->role === 'SUPERADMIN' && $actor->isActive && ! $actor->mustChangePassword
                && $actor->sessionVersion === $request->user()->sessionVersion, 403);
            $action = $delete ? 'delete' : $request->input('action');
            $self = $target->id === $actor->id;
            $data = [];
            $password = null;
            switch ($action) {
                case 'updateProfile':
                    $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
                    $data = $request->validate(['name' => ['required', 'string', 'max:80', FieldRules::rule('person')], 'email' => ['required', 'email', 'max:254', Rule::unique('Admin', 'email')->ignore($target->id)]]);
                    if ($self || ($target->role === 'SUPERADMIN' && $data['email'] !== $target->email)) {
                        $this->confirm($request, $target->email);
                    }
                    if ($data['email'] !== $target->email) {
                        $target->googleSubject = null;
                        $data['sessionVersion'] = $target->sessionVersion + 1;
                    }
                    break;
                case 'setRole':
                    abort_if($self, 403, 'Role akun sendiri tidak dapat diubah.');
                    $data = $request->validate(['role' => 'required|in:ADMIN,SUPERADMIN']);
                    $this->confirm($request, $target->email);
                    $data['sessionVersion'] = $target->sessionVersion + 1;
                    break;
                case 'deactivate':
                    if ($target->role === 'SUPERADMIN') {
                        $this->confirm($request, $target->email);
                    }
                    $data = ['isActive' => false, 'sessionVersion' => $target->sessionVersion + 1];
                    break;
                case 'activate':
                    $data = ['isActive' => true];
                    break;
                case 'recoverAccount':
                case 'resetPassword':
                    abort_if($self, 403, 'Ganti password sendiri melalui Akun Saya.');
                    if ($target->role === 'SUPERADMIN') {
                        $this->confirm($request, $target->email);
                    }
                    if ($action === 'recoverAccount') {
                        if ($target->role !== 'SUPERADMIN') {
                            $this->confirm($request, $target->email);
                        }
                        $target->googleSubject = null;
                    }
                    $password = Str::password(20);
                    $data = ['passwordHash' => Hash::make($password), 'mustChangePassword' => true,
                        'tempPasswordExpiresAt' => now()->addHours(72), 'sessionVersion' => $target->sessionVersion + 1];
                    break;
                case 'delete':
                    $this->confirm($request, $target->email);
                    break;
                default:
                    abort(422, 'Aksi tidak dikenal.');
            }
            $target->fill($data);
            $remaining = $accounts->filter(fn ($account) => (! $delete || $account->id !== $id)
                && $account->role === 'SUPERADMIN' && $account->isActive && ! $account->mustChangePassword)->count();
            if ($remaining === 0) {
                return response()->json(['error' => 'Harus ada minimal satu superadmin aktif yang sudah mengganti password sementara.', 'code' => 'LAST_SUPERADMIN'], 409);
            }
            if ($delete) {
                Audit::record($actor, 'delete', 'accounts', $target->email);
                DB::table('AdminSession')->where('adminId', $id)->delete();
                DB::table('admin_login_sessions')->where('admin_id', $id)->delete();
                $target->delete();
            } else {
                $target->save();
                Audit::record($actor, 'update', 'accounts', $action.': '.$target->email);
            }
            $result = ['ok' => true, 'account' => $this->view($target, $actor)];
            if ($password !== null) {
                $result += ['temporaryPassword' => $password, 'temporaryPasswordValidHours' => 72];
            }

            return response()->json($result);
        });
    }
}
