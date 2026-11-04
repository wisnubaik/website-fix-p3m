<?php

namespace Tests\Feature;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class OrganisationEditorTest extends TestCase
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

    private function record(string $id = 'revision-profil-image-1'): array
    {
        $cell = fn (string $text, array $items = []): array => ['text' => $text, 'items' => $items, 'ordered' => false];
        $table = ['title' => '', 'caption' => 'Struktur organisasi', 'intro' => '', 'note' => '', 'numeric' => false,
            'headers' => ['Unsur', 'Jabatan'], 'rows' => [[$cell('Pimpinan'), $cell('', ['Direktur', 'Wadir Bidang Akademik'])], [$cell('Unit penunjang akademik'), $cell('', ['UPA Bahasa', 'UPA Perpustakaan'])], [$cell('Jurusan Teknik'), $cell('', ['Program studi A'])]]];
        DB::table('DocumentItem')->insert(['id' => $id, 'section' => 'profil-media', 'groupTitle' => 'Organisasi', 'name' => 'Struktur organisasi', 'kind' => 'image', 'href' => '/profil/profil-1.png', 'order' => 0, 'published' => true, 'createdAt' => now(), 'updatedAt' => now()]);
        DB::table('ProfileTableContent')->insert(['documentId' => $id, 'content' => json_encode(['tables' => [$table]]), 'version' => 1, 'updatedAt' => now()]);
        $record = collect($this->getJson('/api/admin/profile-tables')->assertOk()->json())->firstWhere('id', $id);
        unset($record['id']);

        return $record;
    }

    public function test_custom_connections_are_saved_and_cycles_are_rejected(): void
    {
        $record = $this->record();
        $record['content']['tables'][0]['connections'] = [['from' => '0:0', 'to' => '1:0']];
        $saved = $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertOk()->json();
        $this->assertSame($record['content']['tables'][0]['connections'], $saved['content']['tables'][0]['connections']);
        $this->get('/profil')->assertOk()->assertInertia(fn (Assert $page) => $page->where('media', fn ($items) => collect($items)->contains(fn ($item) => ($item['id'] ?? '') === 'revision-profil-image-1' && str_contains($item['profileTable']['content'], '"connections"'))));
        unset($saved['id']);
        $saved['content']['tables'][0]['connections'][] = ['from' => '1:0', 'to' => '0:0'];
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $saved)->assertUnprocessable();
        $content = json_decode(DB::table('ProfileTableContent')->where('documentId', 'revision-profil-image-1')->value('content'), true);
        $this->assertCount(1, $content['tables'][0]['connections']);
    }

    public function test_pnm_and_p3m_keep_optional_organisation_fields_when_saved(): void
    {
        foreach (['revision-profil-image-1', 'revision-profil-image-2'] as $id) {
            $record = $this->record($id);
            $record['content']['tables'][0]['rowRoles'] = ['leader', 'support', 'department'];
            $record['content']['tables'][0]['supportLinks'] = [['leader' => 1, 'units' => [0]]];
            $record['content']['tables'][0]['connections'] = [['from' => '0:0', 'to' => '2:h'], ['from' => '2:h', 'to' => '2:0']];
            $saved = $this->putJson('/api/admin/profile-tables/'.$id, $record)->assertOk()->json();
            foreach (['rowRoles', 'supportLinks', 'connections'] as $key) {
                $this->assertSame($record['content']['tables'][0][$key], $saved['content']['tables'][0][$key]);
            }
        }
    }

    public function test_free_diagram_round_trip_preserves_merged_cells_and_relation_styles(): void
    {
        $record = $this->record();
        $cell = fn (string $id, int $row, int $column, int $span): array => ['id' => $id, 'row' => $row, 'column' => $column, 'rowSpan' => 1, 'colSpan' => $span, 'text' => $id, 'fontSize' => 14, 'bold' => false, 'align' => 'center'];
        $scene = ['version' => 1, 'width' => 1280, 'height' => 914, 'institution' => true, 'heading' => 'Struktur PNM', 'headingX' => 640,
            'nodes' => [['id' => 'group', 'x' => 100, 'y' => 250, 'columns' => [180, 180, 180], 'rows' => [80, 80], 'shape' => 'rectangle', 'dark' => false,
                'cells' => [$cell('director', 0, 0, 3), $cell('deputy1', 1, 0, 1), $cell('deputy2', 1, 1, 1), $cell('deputy3', 1, 2, 1)]]],
            'edges' => [['id' => 'coordination', 'kind' => 'coordination', 'pattern' => 'dotted', 'startMarker' => 'dot', 'endMarker' => 'none',
                'points' => [['x' => 190, 'y' => 410], ['x' => 370, 'y' => 410]], 'source' => ['cellId' => 'deputy1', 'side' => 'bottom', 'ratio' => 0.5], 'target' => ['cellId' => 'deputy2', 'side' => 'bottom', 'ratio' => 0.5]]]];
        $record['content']['tables'][0]['diagram'] = $scene;
        $saved = $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertOk()->json();
        $this->assertSame($scene, $saved['content']['tables'][0]['diagram']);
        $this->get('/profil')->assertOk()->assertInertia(fn (Assert $page) => $page->where('media', fn ($items) => collect($items)->contains(function ($item) use ($scene) {
            return $item['id'] === 'revision-profil-image-1' && json_decode($item['profileTable']['content'], true)['tables'][0]['diagram'] === $scene;
        })));
        unset($saved['id']);
        $scene['nodes'][0]['shape'] = 'ellipse';
        $scene['nodes'][0]['dark'] = true;
        $saved['content']['tables'][0]['diagram'] = $scene;
        $saved = $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $saved)->assertOk()->json();
        $this->assertSame($scene, $saved['content']['tables'][0]['diagram']);
        unset($saved['id']);
        $saved['content']['tables'][0]['diagram']['edges'][0]['target']['cellId'] = 'missing';
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $saved)->assertUnprocessable();
        $stored = json_decode(DB::table('ProfileTableContent')->where('documentId', 'revision-profil-image-1')->value('content'), true);
        $this->assertSame($scene, $stored['tables'][0]['diagram']);
    }

    public function test_group_order_uses_visible_positions_even_if_old_orders_are_sparse(): void
    {
        $this->record('revision-profil-image-1');
        $this->record('revision-profil-image-2');
        DB::table('DocumentItem')->where('id', 'revision-profil-image-1')->update(['order' => 10]);
        DB::table('DocumentItem')->where('id', 'revision-profil-image-2')->update(['order' => 20]);
        $records = collect($this->getJson('/api/admin/profile-tables')->assertOk()->json());
        $record = $records->firstWhere('id', 'revision-profil-image-2');
        unset($record['id']);
        $record['groupPosition'] = 3;
        $this->putJson('/api/admin/profile-tables/revision-profil-image-2', $record)->assertUnprocessable();
        $record['groupPosition'] = 1;
        $this->putJson('/api/admin/profile-tables/revision-profil-image-2', $record)->assertOk();
        $ordered = DB::table('DocumentItem')->whereIn('id', ['revision-profil-image-1', 'revision-profil-image-2'])->orderBy('order')->pluck('id')->all();
        $this->assertSame(['revision-profil-image-2', 'revision-profil-image-1'], $ordered);
    }

    public function test_profile_order_cannot_exceed_its_available_group(): void
    {
        $record = $this->record();
        $record['order'] = 8;
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertUnprocessable()->assertJsonValidationErrors('order');
        $this->assertDatabaseHas('DocumentItem', ['id' => 'revision-profil-image-1', 'order' => 0]);
    }

    public function test_visual_edits_preserve_other_records_and_reject_stale_saves(): void
    {
        $record = $this->record();
        $this->record('revision-profil-image-2');
        $other = DB::table('ProfileTableContent')->where('documentId', 'revision-profil-image-2')->first();
        $table = &$record['content']['tables'][0];
        $table['rowRoles'] = ['leader', 'support', 'department'];
        $table['supportLinks'] = [['leader' => 1, 'units' => [0, 1]]];
        $table['rows'][0][1]['items'][1] = 'Koordinator Akademik';
        $table['rows'][2][0]['text'] = 'Rekayasa dan Teknologi';
        $table['rows'][2][1]['items'][] = 'Program studi B';
        $saved = $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertOk()->assertJsonPath('version', 2)->json();
        $this->get('/profil')->assertInertia(fn (Assert $view) => $view->where('media', fn ($media) => collect($media)->contains(function ($row) {
            if ($row['id'] !== 'revision-profil-image-1') {
                return false;
            }
            $table = json_decode($row['profileTable']['content'], true)['tables'][0];

            return $table['rowRoles'][2] === 'department' && $table['rows'][2][0]['text'] === 'Rekayasa dan Teknologi' && $table['supportLinks'][0]['leader'] === 1;
        })));
        $this->assertEquals($other, DB::table('ProfileTableContent')->where('documentId', 'revision-profil-image-2')->first());
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertConflict();
        unset($saved['id']);
        array_pop($saved['content']['tables'][0]['rows'][2][1]['items']);
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $saved)->assertOk()->assertJsonCount(1, 'content.tables.0.rows.2.1.items');
        $this->assertDatabaseHas('ActivityLog', ['resource' => 'profile-tables', 'action' => 'update']);
    }

    public function test_invalid_roles_or_coordination_cannot_change_saved_content(): void
    {
        $record = $this->record();
        $before = DB::table('ProfileTableContent')->first();
        $invalid = [
            ['rowRoles' => ['leader']],
            ['rowRoles' => ['leader', 'support', 'invented']],
            ['rowRoles' => ['leader', 'support', 'department'], 'supportLinks' => [['leader' => 20, 'units' => [0]]]],
            ['rowRoles' => ['leader', 'support', 'department'], 'supportLinks' => [['leader' => 1, 'units' => [9]]]],
            ['rowRoles' => ['leader', 'support', 'department'], 'supportLinks' => [['leader' => 1, 'units' => [0, 0]]]],
            ['supportLinks' => [['leader' => 1, 'units' => [0]]]],
        ];
        foreach ($invalid as $extra) {
            $request = $record;
            $request['content']['tables'][0] = [...$request['content']['tables'][0], ...$extra];
            $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $request)->assertUnprocessable();
        }
        $this->assertEquals($before, DB::table('ProfileTableContent')->first());
    }

    public function test_deleting_sections_and_permissions_are_preserved(): void
    {
        $record = $this->record();
        array_pop($record['content']['tables'][0]['rows']);
        $record['content']['tables'][0]['rowRoles'] = ['leader', 'support'];
        $record['content']['tables'][0]['supportLinks'] = [];
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertOk()->assertJsonCount(2, 'content.tables.0.rows');
        $admin = Admin::factory()->create(['role' => 'ADMIN']);
        $this->actingAs($admin)->withSession(['admin_version' => $admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
        $this->getJson('/api/admin/profile-tables')->assertForbidden();
        $this->putJson('/api/admin/profile-tables/revision-profil-image-1', $record)->assertForbidden();
    }
}
