<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Support\CmsContent;
use App\Support\CmsExcel;
use App\Support\ExcelColumnGuide;
use App\Support\ExcelWorkbook;
use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;
use ZipArchive;

class ExcelTemplateGuideTest extends TestCase
{
    use RefreshDatabase;

    private Admin $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = Admin::factory()->create(['role' => 'SUPERADMIN']);
        $this->actingAs($this->admin)->withSession(['admin_version' => $this->admin->sessionVersion, 'admin_expires_at' => time() + 43200]);
        $this->withoutMiddleware(ThrottleRequests::class);
    }

    private function xml(ZipArchive $zip, string $name): DOMXPath
    {
        $document = new DOMDocument;
        $this->assertTrue($document->loadXML($zip->getFromName($name)));
        $xpath = new DOMXPath($document);
        $xpath->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        return $xpath;
    }

    public function test_every_bulk_template_has_guidance_examples_prompts_and_validation_for_every_column(): void
    {
        foreach (array_diff(array_keys(CmsContent::TABLES), ['hero', 'settings', 'acara-periode']) as $resource) {
            $config = $resource === 'monev-slot' ? ['scope' => ['acara' => 'monev', 'periodeId' => 'periode-fixture', 'skemaId' => 'skema-fixture']] : [];
            $definition = CmsExcel::definition($this->admin, $resource, $config);
            $file = ExcelWorkbook::template(CmsExcel::signature($definition), $definition['columns'], $resource);
            $zip = new ZipArchive;
            $zip->open($file);
            try {
                $book = $this->xml($zip, 'xl/workbook.xml');
                $this->assertSame('1', $book->evaluate('string(//s:workbookView/@activeTab)'));
                foreach (['Data', 'Panduan', 'Contoh'] as $sheet) {
                    $this->assertSame(1, $book->query('//s:sheet[@name="'.$sheet.'"]')->length);
                }
                $data = $this->xml($zip, 'xl/worksheets/sheet1.xml');
                $this->assertSame(1, $data->query('//s:sheetData/s:row')->length, 'Data must start empty, without examples.');
                $this->assertSame(count($definition['columns']), $data->query('//s:dataValidation')->length);
                $guide = $this->xml($zip, 'xl/worksheets/sheet2.xml');
                foreach ($definition['columns'] as $column) {
                    $this->assertNotEmpty($column['help']);
                    $this->assertNotEmpty($column['blank']);
                    $this->assertNotEmpty($column['example']);
                    $this->assertStringContainsString($column['help'], $guide->document->textContent);
                }
                foreach ($data->query('//s:dataValidation') as $rule) {
                    $this->assertSame('1', $rule->getAttribute('showInputMessage'));
                    $this->assertSame('1', $rule->getAttribute('showErrorMessage'));
                    $this->assertSame('stop', $rule->getAttribute('errorStyle'));
                    $this->assertLessThanOrEqual(255, mb_strlen($rule->getAttribute('prompt')));
                    $this->assertLessThanOrEqual(32, mb_strlen($rule->getAttribute('promptTitle')));
                    $this->assertLessThanOrEqual(225, mb_strlen($rule->getAttribute('error')));
                    $this->assertLessThanOrEqual(255, mb_strlen($data->evaluate('string(s:formula1)', $rule)));
                }
                $this->xml($zip, 'xl/worksheets/sheet4.xml');
                $this->xml($zip, 'xl/worksheets/sheet5.xml');
            } finally {
                $zip->close();
                unlink($file);
            }
        }
    }

    public function test_example_sheet_never_counts_as_imported_data_and_old_signatures_still_match(): void
    {
        $definition = CmsExcel::definition($this->admin, 'riset-entries', ['scope' => ['category' => 'pkm-internal']]);
        $old = $definition;
        unset($old['maxRows']);
        foreach ($old['columns'] as &$column) {
            unset($column['example'], $column['blank'], $column['rule']);
        }
        unset($column);
        $this->assertSame(CmsExcel::signature($old), CmsExcel::signature($definition));
        $file = ExcelWorkbook::template(CmsExcel::signature($definition), $definition['columns'], 'PkM Internal');
        try {
            ExcelWorkbook::read($file, CmsExcel::signature($definition), $definition['columns']);
            $this->fail('Empty Data sheet should be rejected, even when Contoh contains a row.');
        } catch (ValidationException $exception) {
            $this->assertStringContainsString('belum berisi data', $exception->getMessage());
        } finally {
            unlink($file);
        }
    }

    public function test_publication_and_other_boolean_instructions_are_distinct(): void
    {
        $definition = CmsExcel::definition($this->admin, 'announcements', []);
        $this->assertStringContainsString('draf', $definition['columns']['published']['help']);
        $this->assertStringNotContainsString('draf', $definition['columns']['urgent']['help']);
        $this->assertSame('Tidak', $definition['columns']['published']['example']);
        $inline = CmsExcel::definition($this->admin, 'rows', ['maxRows' => 80, 'columns' => [['key' => 'c1', 'type' => 'integer', 'nullable' => true], ['key' => 'ordered', 'type' => 'boolean']]]);
        $this->assertSame('Tidak diisi, bukan angka nol.', $inline['columns']['c1']['blank']);
        $file = ExcelWorkbook::template(CmsExcel::signature($inline), $inline['columns'], 'Profil', ['maxRows' => 80, 'inline' => true]);
        $zip = new ZipArchive;
        $zip->open($file);
        try {
            $guide = $this->xml($zip, 'xl/worksheets/sheet2.xml');
            $this->assertStringContainsString('tidak langsung menerbitkan', $guide->document->textContent);
            $this->assertStringContainsString('Maksimal 80 baris', $guide->document->textContent);
            $data = $this->xml($zip, 'xl/worksheets/sheet1.xml');
            $this->assertSame('A2:A81', $data->query('//s:dataValidation')->item(0)->getAttribute('sqref'));
        } finally {
            $zip->close();
            unlink($file);
        }
    }

    public function test_long_choices_and_commas_use_named_ranges_instead_of_invalid_inline_lists(): void
    {
        $options = array_map(fn ($i) => 'Pilihan '.$i.', keterangan cukup panjang', range(1, 30));
        $definition = CmsExcel::definition($this->admin, 'rows', ['columns' => [['key' => 'jenis', 'options' => $options]]]);
        $file = ExcelWorkbook::template(CmsExcel::signature($definition), $definition['columns'], 'Pilihan');
        $zip = new ZipArchive;
        $zip->open($file);
        try {
            $book = $this->xml($zip, 'xl/workbook.xml');
            $this->assertSame("'_Pilihan'!\$A\$1:\$A\$30", $book->evaluate('string(//s:definedName[@name="P3MChoice1"])'));
            $data = $this->xml($zip, 'xl/worksheets/sheet1.xml');
            $this->assertSame('P3MChoice1', $data->evaluate('string(//s:dataValidation/s:formula1)'));
            $choices = $this->xml($zip, 'xl/worksheets/sheet5.xml');
            $this->assertSame(30, $choices->query('//s:sheetData/s:row')->length);
        } finally {
            $zip->close();
            unlink($file);
        }
    }

    public function test_server_errors_include_row_column_and_specific_correction_guidance(): void
    {
        $definition = CmsExcel::definition($this->admin, 'riset-entries', ['scope' => ['category' => 'pkm-internal']]);
        $result = CmsExcel::prepare($this->admin, $definition, [['number' => 2, 'values' => ['year' => 'test', 'title' => 'Judul', 'leader' => 'Dosen', 'funding' => '1000', 'published' => 'Tidak']]]);
        $this->assertSame(1, $result['errorCount']);
        $this->assertSame(2, $result['errors'][0]['row']);
        $this->assertSame('Tahun', $result['errors'][0]['field']);
        $this->assertStringContainsString('Tahun 4 digit', $result['errors'][0]['hint']);
        $this->assertSame([], $result['rows']);
        $valid = CmsExcel::prepare($this->admin, $definition, [['number' => 2, 'values' => ['year' => '2026', 'title' => 'Judul', 'leader' => 'Dosen', 'funding' => '1000', 'published' => '']]]);
        $this->assertSame(0, $valid['errorCount']);
        $this->assertFalse($valid['rows'][0]['values']['published']);
    }

    public function test_formula_lengths_fit_excel_for_wide_profile_tables(): void
    {
        foreach (['text', 'integer', 'number', 'boolean', 'date', 'time', 'pairs', 'lines', 'year'] as $rule) {
            foreach ([true, false] as $required) {
                $formula = ExcelColumnGuide::formula('CB2', ['rule' => $rule, 'type' => 'text', 'required' => $required]);
                $this->assertLessThanOrEqual(255, strlen($formula), $rule);
            }
        }
    }
}
