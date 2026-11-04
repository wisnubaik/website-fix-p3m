<?php

namespace App\Http\Controllers;

use App\Http\Requests\SaveResearchRequest;
use App\Models\RisetEntry;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class AdminResearchController extends Controller
{
    public function dashboard(): Response
    {
        return Inertia::render('Admin/Dashboard', [
            'counts' => [
                DB::table('Announcement')->whereNull('deletedAt')->count(),
                DB::table('TautanPengusulan')->whereNull('deletedAt')->count(),
                DB::table('RisetGrup')->whereNull('deletedAt')->count(),
                DB::table('DocumentItem')->whereNull('deletedAt')->whereIn('section', ['monev', 'semhas', 'ki', 'panduan', 'asesmen'])->count(),
                DB::table('DocumentItem')->whereNull('deletedAt')->whereIn('section', ['luaran', 'laporan-keuangan', 'mitra', 'kegiatan', 'sinta', 'tkt'])->count(),
                DB::table('Winner')->whereNull('deletedAt')->count(),
                DB::table('Staff')->whereNull('deletedAt')->count(),
            ],
            'missingDocs' => DB::table('DocumentItem')->whereNull('deletedAt')->where(fn ($query) => $query->whereNull('href')->orWhere('href', ''))->orderBy('section')->orderBy('order')->get(['id', 'name', 'section', 'kind']),
            'missingAnnouncements' => DB::table('Announcement')->whereNull('deletedAt')->where(fn ($query) => $query->whereNull('href')->orWhere('href', ''))->orderBy('order')->get(['id', 'num', 'title', 'kind']),
        ]);
    }

    public function index(Request $request): Response
    {
        $filters = $request->validate([
            'category' => ['sometimes', Rule::in(array_keys(RisetEntry::CATEGORIES))],
            'q' => ['nullable', 'string', 'max:200'], 'trash' => ['sometimes', 'boolean'],
        ]);
        $category = $filters['category'] ?? 'penelitian-internal';
        $query = RisetEntry::query()->where('category', $category);
        if ($request->boolean('trash')) {
            $query->onlyTrashed();
        }
        if ($search = ($filters['q'] ?? '')) {
            $query->where(fn ($q) => $q->where('title', 'like', '%'.$search.'%')->orWhere('leader', 'like', '%'.$search.'%'));
        }

        return Inertia::render('Admin/Content', [
            'page' => 'riset-entries',
            'entries' => $query->orderByDesc('year')->orderBy('order')->orderBy('id')->paginate(20)->withQueryString(),
            'categories' => RisetEntry::CATEGORIES,
            'filters' => ['category' => $category, 'q' => $filters['q'] ?? '', 'trash' => $request->boolean('trash')],
        ]);
    }

    public function store(SaveResearchRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $entry = RisetEntry::create($request->validated());
            Audit::record($request->user(), 'create', 'riset-entries', $entry->id);
        });

        return back()->with('success', 'Entri berhasil ditambahkan.');
    }

    public function update(SaveResearchRequest $request, RisetEntry $entry): RedirectResponse
    {
        DB::transaction(function () use ($request, $entry) {
            $entry->update($request->validated());
            Audit::record($request->user(), 'update', 'riset-entries', $entry->id);
        });

        return back()->with('success', 'Perubahan berhasil disimpan.');
    }

    public function destroy(Request $request, RisetEntry $entry): RedirectResponse
    {
        DB::transaction(function () use ($request, $entry) {
            $entry->delete();
            Audit::record($request->user(), 'delete', 'riset-entries', $entry->id);
        });

        return back()->with('success', 'Entri dipindahkan ke sampah.');
    }

    public function restore(Request $request, string $id): RedirectResponse
    {
        $entry = RisetEntry::onlyTrashed()->findOrFail($id);
        DB::transaction(function () use ($request, $entry) {
            $entry->restore();
            Audit::record($request->user(), 'restore', 'riset-entries', $entry->id);
        });

        return back()->with('success', 'Entri berhasil dipulihkan.');
    }
}
