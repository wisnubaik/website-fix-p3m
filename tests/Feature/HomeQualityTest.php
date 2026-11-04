<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\ManagedContent;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class HomeQualityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
    }

    public function test_program_level_migration_preserves_content_and_custom_levels(): void
    {
        $defaults = json_decode(file_get_contents(database_path('cms-default-content.json')), true)['tables']['DocumentItem'];
        $base = collect($defaults)->first(fn ($row) => $row['section'] === 'home-prodi');
        foreach (['old' => 'Program D-IV', 'generic' => 'Program studi', 'custom' => 'Sarjana Terapan'] as $id => $group) {
            DB::table('DocumentItem')->insert([...$base, 'id' => 'level-test-'.$id, 'name' => 'D-IV Nama prodi', 'groupTitle' => $group, 'published' => false]);
        }
        $migration = require database_path('migrations/2026_10_28_020000_normalize_home_program_levels.php');
        $migration->up();
        $migration->up();
        foreach (['old' => 'Diploma IV', 'generic' => 'Diploma IV', 'custom' => 'Sarjana Terapan'] as $id => $group) {
            $this->assertDatabaseHas('DocumentItem', ['id' => 'level-test-'.$id, 'name' => 'D-IV Nama prodi', 'groupTitle' => $group, 'published' => false, 'href' => $base['href']]);
        }
    }

    public function test_home_copy_metadata_and_fixed_arrow_labels_publish_together(): void
    {
        $page = DB::table('managed_pages')->where('path', '/')->first();
        $document = ManagedContent::decode($page->draft);
        $document['title'] = 'Judul baru beranda P3M';
        $document['description'] = 'Ringkasan beranda yang baru.';
        $document['fields']['f_b3973ad0cd14bb'] = 'Agenda kampus →';
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'save', 'document' => $document])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->where('seo.title', 'P3M Politeknik Negeri Madiun'));
        $this->get('/?cms_preview=1')->assertInertia(fn (Assert $view) => $view->where('seo.title', $document['title']));
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 2, 'action' => 'publish', 'document' => $document])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->where('seo.title', $document['title'])->where('seo.description', $document['description'])->where('cms.fields.f_b3973ad0cd14bb', 'Agenda kampus'));
    }

    public function test_link_options_follow_publication_and_backend_rejects_invented_destinations(): void
    {
        $new = $this->postJson('/api/admin/managed-pages', ['title' => 'Layanan baru', 'path' => '/layanan-baru', 'template' => 'information'])->assertCreated()->json('page');
        $this->getJson('/api/admin/link-options')->assertOk()->assertJsonMissing(['href' => '/layanan-baru']);
        $this->putJson('/api/admin/managed-pages/'.$new['id'], ['version' => 1, 'action' => 'publish', 'document' => $new['document']])->assertOk();
        $this->getJson('/api/admin/link-options')->assertJsonFragment(['href' => '/layanan-baru']);
        $home = DB::table('managed_pages')->where('path', '/')->first();
        $document = ManagedContent::decode($home->draft);
        foreach (['/tidak-ada', '/admin/akun', '//evil.test', '/layanan-baru/../admin', 'https://example.com'] as $url) {
            $document['fields']['f_707d17eb2013fe'] = $url;
            $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 1, 'action' => 'save', 'document' => $document])->assertUnprocessable();
        }
        $document['fields']['f_707d17eb2013fe'] = '/layanan-baru';
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 1, 'action' => 'publish', 'document' => $document])->assertOk();
        $this->postJson('/api/admin/quick-access', ['title' => 'Salah', 'meta' => 'Halaman', 'iconName' => 'FileText', 'href' => '/tidak-ada'])->assertUnprocessable();
        $this->putJson('/api/admin/managed-pages/'.$new['id'], ['version' => 2, 'action' => 'unpublish'])->assertOk();
        $this->getJson('/api/admin/link-options')->assertJsonMissing(['href' => '/layanan-baru']);
        $this->putJson('/api/admin/managed-pages/'.$home->id, ['version' => 2, 'action' => 'publish', 'document' => $document])->assertUnprocessable();
    }

    public function test_agenda_and_recap_rows_are_independently_editable(): void
    {
        $id = $this->postJson('/api/admin/content-list', ['section' => 'home-agenda', 'label' => 'Agenda Oktober', 'text' => 'Penandatanganan kontrak', 'published' => true])->assertCreated()->json('id');
        $this->putJson('/api/admin/content-list/'.$id, ['label' => 'Agenda November'])->assertOk();
        $funding = $this->postJson('/api/admin/stat-entries', ['group' => 'pendanaan-resmi-2026', 'label' => 'Didanai BIMA 2027', 'value' => 8, 'published' => true])->assertCreated()->json('id');
        $this->postJson('/api/admin/stat-entries', ['group' => 'pendanaan-resmi-2026', 'label' => 'Hilirisasi 2028', 'value' => 4, 'published' => true])->assertCreated();
        $this->putJson('/api/admin/stat-entries/'.$funding, ['label' => 'Pendanaan penelitian 2029', 'value' => 11])->assertOk();
        $this->get('/')->assertInertia(fn (Assert $view) => $view->where('agenda.0.label', 'Agenda November')->where('agenda.0.text', 'Penandatanganan kontrak')->has('pendanaan', 2)->where('pendanaan', fn ($rows) => collect($rows)->contains(fn ($row) => $row['label'] === 'Pendanaan penelitian 2029' && $row['value'] === 11)));
        $this->putJson('/api/admin/stat-entries/'.$funding, ['value' => -1])->assertUnprocessable();
    }

    public function test_revisions_are_capped_and_unchanged_saves_do_not_fill_history(): void
    {
        $page = DB::table('managed_pages')->where('path', '/')->first();
        $doc = ManagedContent::decode($page->draft);
        $version = 1;
        for ($i = 1; $i <= 23; $i++) {
            $doc['title'] = 'Versi '.$i;
            $response = $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $version++, 'action' => 'save', 'document' => $doc])->assertOk();
        }
        $response->assertJsonCount(20, 'revisions');
        $ids = DB::table('managed_page_revisions')->orderBy('id')->pluck('id')->all();
        $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $version, 'action' => 'save', 'document' => $doc])->assertOk()->assertJsonCount(20, 'revisions');
        $this->assertSame($ids, DB::table('managed_page_revisions')->orderBy('id')->pluck('id')->all());
    }

    public function test_static_svg_upload_is_supported_and_active_svg_is_rejected(): void
    {
        $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g"><stop stop-color="#123456"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/></svg>';
        $url = $this->post('/api/admin/upload', ['file' => UploadedFile::fake()->createWithContent('ilustrasi.svg', $svg), 'visibility' => 'public'])->assertCreated()->json('url');
        try {
            $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/svg+xml')->assertHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox; frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'");
            $page = DB::table('managed_pages')->where('path', '/')->first();
            $doc = ManagedContent::decode($page->draft);
            $doc['fields']['f_b0f023e38df8fb'] = $url;
            $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => 1, 'action' => 'publish', 'document' => $doc])->assertOk();
            foreach (['<script>alert(1)</script>', '<foreignObject/>', '<image href="https://example.com/a.png"/>', '<path onload="alert(1)"/>', '<style>@import "https://example.com";</style>', '<use href="https://example.com/x.svg#x"/>'] as $content) {
                $this->post('/api/admin/upload', ['file' => UploadedFile::fake()->createWithContent('aktif.svg', '<svg xmlns="http://www.w3.org/2000/svg">'.$content.'</svg>')], ['Accept' => 'application/json'])->assertUnprocessable();
            }
            $this->assertDatabaseCount('UploadAsset', 1);
        } finally {
            @unlink(storage_path('app/private/uploads/'.basename($url)));
        }
    }

    public function test_migration_preserves_existing_agenda_and_funding_values(): void
    {
        $migration = require database_path('migrations/2026_10_13_111934_add_home_content_labels.php');
        $migration->down();
        DB::table('ContentListItem')->insert(['id' => 'agenda-old', 'section' => 'home-agenda', 'text' => 'Agenda lama', 'order' => 0, 'published' => true]);
        DB::table('StatEntry')->insert(['id' => 'funding-old', 'group' => 'pendanaan-resmi-2026', 'label' => 'BIMA', 'value' => 7, 'order' => 0, 'published' => true]);
        $migration->up();
        $this->assertDatabaseHas('ContentListItem', ['id' => 'agenda-old', 'text' => 'Agenda lama', 'label' => 'Agenda berjalan 2026']);
        $this->assertDatabaseHas('StatEntry', ['id' => 'funding-old', 'label' => 'Didanai BIMA 2026', 'value' => 7]);
        $this->get('/?cms_preview=1')->assertOk()->assertInertia(fn (Assert $view) => $view->where('agenda.0.label', 'Agenda berjalan 2026')->where('agenda.0.text', 'Agenda lama'));
        $this->get('/')->assertOk();
    }

    public function test_svg_exports_and_existing_animated_illustration_can_be_uploaded(): void
    {
        $export = <<<'SVG'
<?xml version="1.0"?>
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" width="100" height="100">
<metadata><rdf:RDF><rdf:Description>Design export</rdf:Description></rdf:RDF></metadata>
<sodipodi:namedview inkscape:zoom="1"/>
<style>/* Exported styles */ .shape { fill: #346; filter: url(#shadow); }</style>
<defs><filter id="shadow"><feDropShadow dx="1" dy="1" stdDeviation="2"/><feComponentTransfer><feFuncA type="linear" slope="0.5"/></feComponentTransfer></filter></defs>
<rect class="shape" inkscape:label="Box" width="50" height="50" style="/* fill */ stroke: #fff"><animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/></rect>
</svg>
SVG;
        foreach ([$export, file_get_contents(public_path('business-team.svg'))] as $svg) {
            $url = $this->postJson('/api/admin/upload', ['file' => UploadedFile::fake()->createWithContent('export.svg', $svg), 'visibility' => 'public'])->assertCreated()->json('url');
            $path = storage_path('app/private/uploads/'.basename($url));
            try {
                $clean = file_get_contents($path);
                $this->assertStringNotContainsString('<!DOCTYPE', $clean);
                $this->assertStringNotContainsString('<metadata', $clean);
                $this->assertStringNotContainsString('<sodipodi:namedview', $clean);
                $this->assertStringNotContainsString('inkscape:label=', $clean);
                $this->assertStringContainsString('<animate', $clean);
                $page = DB::table('managed_pages')->where('path', '/')->first();
                $doc = ManagedContent::decode($page->draft);
                $doc['fields']['f_b0f023e38df8fb'] = $url;
                $this->putJson('/api/admin/managed-pages/'.$page->id, ['version' => $page->version, 'action' => 'save', 'document' => $doc])->assertOk();
                $this->get('/?cms_preview=1')->assertOk()->assertInertia(fn (Assert $view) => $view->where('cms.fields.f_b0f023e38df8fb', $url));
                $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
            } finally {
                @unlink($path);
            }
        }
    }

    public function test_running_pending_home_migration_restores_draft_preview_without_losing_agenda(): void
    {
        $name = '2026_10_13_111934_add_home_content_labels';
        $migration = require database_path('migrations/'.$name.'.php');
        $migration->down();
        DB::table('migrations')->where('migration', $name)->delete();
        DB::table('ContentListItem')->insert(['id' => 'retained-agenda', 'section' => 'home-agenda', 'text' => 'Data tetap ada', 'order' => 0, 'published' => true]);
        if (DB::getDriverName() === 'mysql') {
            $this->withoutExceptionHandling();
            try {
                $this->get('/?cms_preview=1');
                $this->fail('Preview should expose the missing label column before the migration.');
            } catch (QueryException $exception) {
                $this->assertStringContainsString('label', $exception->getMessage());
            }
        }
        $this->artisan('migrate', ['--path' => 'database/migrations/'.$name.'.php', '--force' => true])->assertSuccessful();
        $this->get('/?cms_preview=1')->assertOk()->assertInertia(fn (Assert $view) => $view->where('agenda.0.text', 'Data tetap ada')->where('agenda.0.label', 'Agenda berjalan 2026'));
        $this->assertDatabaseHas('ContentListItem', ['id' => 'retained-agenda', 'text' => 'Data tetap ada']);
    }

    public function test_unsafe_svg_animation_entities_and_obfuscated_css_are_rejected(): void
    {
        $contents = [
            '<animate attributeName="href" values="javascript:alert(1)"/>',
            '<animate attributeName="xlink:href" values="#a;https://example.com"/>',
            '<animate attributeName="onload" values="alert(1)"/>',
            '<animate attributeName="style" values="background:red"/>',
            '<animateTransform attributeName="href" type="rotate" values="0;360"/>',
            '<animate attributeName="fill" values="url(https://example.com/a.svg#g)"/>',
            '<animate attributeName="opacity" href="https://example.com/a.svg#g" values="0;1"/>',
            '<style>@im/**/port "https://example.com/style.css";</style>',
            '<rect style="fill:u/**/rl(https://example.com/a.svg#g)"/>',
            '<style>.x { fill: u\\72l(https://example.com/a.svg#g) }</style>',
            '<set attributeName="href" to="javascript:alert(1)"/>',
            '<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">HTML</div></foreignObject>',
        ];
        foreach ($contents as $content) {
            $svg = '<svg xmlns="http://www.w3.org/2000/svg">'.$content.'</svg>';
            $this->postJson('/api/admin/upload', ['file' => UploadedFile::fake()->createWithContent('unsafe.svg', $svg)])->assertUnprocessable()->assertJsonValidationErrors('file');
        }
        foreach (['<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>', '<!DOCTYPE svg SYSTEM "https://example.com/external.dtd">'] as $doctype) {
            $this->postJson('/api/admin/upload', ['file' => UploadedFile::fake()->createWithContent('entity.svg', $doctype.'<svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>')])->assertUnprocessable()->assertJsonValidationErrors('file');
        }
        $this->assertDatabaseCount('UploadAsset', 0);
    }
}
