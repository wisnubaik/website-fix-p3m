<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\RisetEntry;
use App\Models\User;
use App\Support\SqliteToMysql;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use RuntimeException;
use Tests\TestCase;

class MysqlMigrationTest extends TestCase
{
    use RefreshDatabase;

    private ?string $sourceFile = null;

    private array $backupDirectories = [];

    protected function setUp(): void
    {
        parent::setUp();
        if (DB::connection()->getDriverName() !== 'mysql') {
            $this->markTestSkipped('Jalankan memakai phpunit.mysql.xml dan database p3m_testing.');
        }
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
    }

    protected function tearDown(): void
    {
        DB::purge('migration_source');
        if ($this->sourceFile !== null) {
            @unlink($this->sourceFile);
        }
        foreach ($this->backupDirectories as $directory) {
            File::deleteDirectory($directory);
        }
        parent::tearDown();
    }

    private function fixture(): string
    {
        $this->sourceFile = tempnam(sys_get_temp_dir(), 'p3m-source-');
        config(['database.connections.migration_source' => [
            'driver' => 'sqlite', 'database' => $this->sourceFile, 'prefix' => '', 'foreign_key_constraints' => true,
        ]]);
        Artisan::call('migrate', ['--database' => 'migration_source', '--force' => true, '--no-interaction' => true]);
        Admin::factory()->connection('migration_source')->create(['email' => 'admin@example.test', 'role' => 'SUPERADMIN']);
        User::factory()->connection('migration_source')->create();
        RisetEntry::factory()->connection('migration_source')->create([
            'id' => 'legacy-row', 'title' => "  Judul café 😀\nBaris kedua  ", 'member1' => '', 'member2' => null,
            'funding' => 0, 'published' => false, 'createdAt' => '2026-10-09 01:02:03.123',
            'updatedAt' => '2026-10-09 01:02:03.123', 'deletedAt' => '2026-10-09 01:02:03.123',
        ]);
        DB::connection('migration_source')->table('DocumentItem')->insert([
            'id' => 'profile-test', 'section' => 'profil-media', 'groupTitle' => 'Profil', 'name' => 'Tabel', 'kind' => 'link',
            'order' => 0, 'createdAt' => '2026-10-09 01:02:03.123', 'updatedAt' => '2026-10-09 01:02:03.123', 'published' => true,
        ]);
        DB::connection('migration_source')->table('ProfileTableContent')->insert([
            'documentId' => 'profile-test', 'content' => json_encode(['text' => str_repeat('é', 40000)], JSON_UNESCAPED_UNICODE),
            'version' => 1, 'updatedAt' => '2026-10-09 01:02:03.123',
        ]);
        DB::connection('migration_source')->table('sessions')->insert(['id' => 'old-session', 'payload' => 'old', 'last_activity' => time()]);

        return $this->sourceFile;
    }

    private function import(string $source): array
    {
        $report = app(SqliteToMysql::class)->run($source);
        $this->backupDirectories[] = dirname($report['backup']);

        return $report;
    }

    public function test_dry_run_writes_neither_target_nor_source(): void
    {
        $source = $this->fixture();
        $hash = hash_file('sha256', $source);
        $report = app(SqliteToMysql::class)->run($source, mode: 'dry-run');
        $this->assertNull($report['backup']);
        $this->assertSame(5, $report['total_rows']);
        $this->assertDatabaseCount('Admin', 0);
        $this->assertSame($hash, hash_file('sha256', $source));
    }

    public function test_import_preserves_content_passwords_dates_and_creates_verified_backup(): void
    {
        $source = $this->fixture();
        $hash = hash_file('sha256', $source);
        $passwordHash = DB::connection('migration_source')->table('Admin')->value('passwordHash');
        $report = $this->import($source);
        $this->assertSame($hash, hash_file('sha256', $source));
        $this->assertTrue($report['tables']['RisetEntry']['verified']);
        $this->assertSame($passwordHash, DB::table('Admin')->value('passwordHash'));
        $this->assertSame(1, $report['skipped']['sessions']);
        $this->assertDatabaseCount('sessions', 0);
        $this->assertDatabaseHas('RisetEntry', ['title' => "  Judul café 😀\nBaris kedua  ", 'funding' => 0, 'member1' => '', 'member2' => null, 'createdAt' => '2026-10-09 01:02:03.123']);
        $this->assertGreaterThan(65535, strlen(DB::table('ProfileTableContent')->value('content')));
        $this->assertFileExists($report['report_path']);
        $this->assertSame($report['backup_sha256'], hash_file('sha256', $report['backup']));
        $verified = app(SqliteToMysql::class)->run($report['backup'], mode: 'verify');
        $this->assertSame($report['tables'], $verified['tables']);
    }

    public function test_import_refuses_a_nonempty_target(): void
    {
        $source = $this->fixture();
        RisetEntry::factory()->create();
        try {
            app(SqliteToMysql::class)->run($source);
            $this->fail('Impor harus menolak tujuan terisi.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('tidak kosong', $error->getMessage());
            $this->assertDatabaseCount('RisetEntry', 1);
            $this->assertDatabaseCount('Admin', 0);
        }
    }

    public function test_mysql_rejection_rolls_back_all_preceding_inserts(): void
    {
        $source = $this->fixture();
        Admin::factory()->connection('migration_source')->create(['email' => 'ADMIN@example.test']);
        try {
            app(SqliteToMysql::class)->run($source);
            $this->fail('Indeks unik MySQL harus menolak email duplikat.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('MySQL menolak', $error->getMessage());
            $this->assertStringNotContainsString('passwordHash', $error->getMessage());
            $this->assertDatabaseCount('users', 0);
            $this->assertDatabaseCount('Admin', 0);
            $this->assertDatabaseCount('DocumentItem', 0);
        }
    }

    public function test_verification_detects_content_changes_without_mutating_them(): void
    {
        $source = $this->fixture();
        $this->import($source);
        DB::table('RisetEntry')->update(['title' => 'Diubah']);
        try {
            app(SqliteToMysql::class)->run($source, mode: 'verify');
            $this->fail('Verifikasi harus mendeteksi perubahan.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('berbeda', $error->getMessage());
            $this->assertDatabaseHas('RisetEntry', ['title' => 'Diubah']);
        }
    }

    public function test_unknown_source_tables_are_rejected_instead_of_silently_ignored(): void
    {
        $source = $this->fixture();
        DB::connection('migration_source')->statement('CREATE TABLE extra_data (id INTEGER PRIMARY KEY)');
        $this->expectExceptionMessage('Daftar tabel berbeda');
        app(SqliteToMysql::class)->run($source, mode: 'dry-run');
    }

    public function test_fractional_source_integer_is_rejected_without_losing_precision(): void
    {
        $source = $this->fixture();
        DB::connection('migration_source')->table('RisetEntry')->update(['funding' => 1.25]);
        $hash = hash_file('sha256', $source);
        try {
            app(SqliteToMysql::class)->run($source, mode: 'dry-run');
            $this->fail('Data integer pecahan tidak boleh dibulatkan diam-diam.');
        } catch (RuntimeException $error) {
            $this->assertStringContainsString('bukan bilangan bulat', $error->getMessage());
            $this->assertSame($hash, hash_file('sha256', $source));
            $this->assertDatabaseCount('RisetEntry', 0);
        }
    }

    public function test_database_session_can_store_a_string_admin_id_after_login(): void
    {
        config(['session.driver' => 'database']);
        $this->app->forgetInstance('session');
        $this->app->forgetInstance('session.store');
        Admin::factory()->create(['id' => 'cmflegacyadmin001', 'email' => 'login@example.test']);
        $this->post('/admin/login', ['email' => 'login@example.test', 'password' => 'Orion!River-47-Lantern'])->assertRedirect('/admin');
        $this->assertDatabaseHas('sessions', ['user_id' => 'cmflegacyadmin001']);
        $this->get('/admin')->assertOk();
    }
}
