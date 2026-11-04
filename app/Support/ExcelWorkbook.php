<?php

namespace App\Support;

use DOMDocument;
use DOMXPath;
use Illuminate\Validation\ValidationException;
use ZipArchive;

/** Bounded, data-only OOXML reader. Formulas and external workbooks are never evaluated. */
class ExcelWorkbook
{
    public static function fail(string $message): never
    {
        throw ValidationException::withMessages(['file' => $message]);
    }

    private static function xml(string $xml): DOMDocument
    {
        if ($xml === '' || strlen($xml) > 20000000 || preg_match('/<!DOCTYPE|<!ENTITY/i', $xml)) {
            self::fail('Struktur Excel tidak diizinkan.');
        }
        $previous = libxml_use_internal_errors(true);
        try {
            $document = new DOMDocument;
            if (! $document->loadXML($xml, LIBXML_NONET | LIBXML_COMPACT)) {
                self::fail('Berkas Excel rusak atau tidak dapat dibaca.');
            }

            return $document;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
    }

    private static function xpath(string $xml): DOMXPath
    {
        $path = new DOMXPath(self::xml($xml));
        $path->registerNamespace('s', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main');

        return $path;
    }

    public static function read(string $file, string $signature, array $columns): array
    {
        abort_unless(class_exists(ZipArchive::class), 503, 'Aktifkan ekstensi PHP zip.');
        $zip = new ZipArchive;
        if ($zip->open($file) !== true) {
            self::fail('Gunakan Excel .xlsx dari template yang disediakan.');
        }
        try {
            $total = 0;
            $names = [];
            if ($zip->numFiles > 200) {
                self::fail('Terlalu banyak komponen Excel.');
            }
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                $name = $stat['name'];
                $total += $stat['size'];
                if (isset($names[$name]) || $total > 40000000 || $stat['size'] > 20000000 || preg_match('~(^/|\.\.|vbaProject|externalLinks|embeddings)~i', $name)) {
                    self::fail('Excel terlalu besar atau memiliki komponen yang tidak didukung.');
                }
                $names[$name] = true;
                if (str_ends_with($name, '.rels')) {
                    foreach (self::xml($zip->getFromName($name))->getElementsByTagName('Relationship') as $rel) {
                        if ($rel->getAttribute('TargetMode') === 'External' && ! str_ends_with($rel->getAttribute('Type'), '/hyperlink')) {
                            self::fail('Hapus tautan workbook eksternal sebelum mengimpor.');
                        }
                    }
                }
            }
            $workbook = self::xpath($zip->getFromName('xl/workbook.xml') ?: '');
            $relationships = self::xml($zip->getFromName('xl/_rels/workbook.xml.rels') ?: '');
            $targets = [];
            foreach ($relationships->getElementsByTagName('Relationship') as $rel) {
                $target = $rel->getAttribute('Target');
                if (str_contains($target, '..') || str_contains($target, '\\')) {
                    self::fail('Lokasi sheet tidak valid.');
                }
                $targets[$rel->getAttribute('Id')] = str_starts_with($target, '/') ? ltrim($target, '/') : 'xl/'.$target;
            }
            $sheets = [];
            foreach ($workbook->query('//s:sheet') as $sheet) {
                $sheets[$sheet->getAttribute('name')] = $targets[$sheet->getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id')] ?? '';
            }
            $strings = [];
            if (isset($names['xl/sharedStrings.xml'])) {
                $shared = self::xpath($zip->getFromName('xl/sharedStrings.xml'));
                foreach ($shared->query('//s:si') as $item) {
                    $text = '';
                    foreach ($shared->query('.//s:t', $item) as $node) {
                        $text .= $node->textContent;
                    }
                    if (strlen($text) > 80000 || count($strings) > 100000) {
                        self::fail('Isi sel terlalu panjang.');
                    }
                    $strings[] = $text;
                }
            }
            $readSheet = function (string $name, int $limit) use ($zip, $sheets, $strings): array {
                if (empty($sheets[$name])) {
                    self::fail('Sheet '.$name.' tidak ditemukan. Unduh ulang template.');
                }
                $path = self::xpath($zip->getFromName($sheets[$name]) ?: '');
                $rows = [];
                $seen = [];
                foreach ($path->query('//s:sheetData/s:row') as $row) {
                    $number = (int) $row->getAttribute('r');
                    $cells = [];
                    if ($number < 1 || isset($seen[$number]) || count($seen) > 10000) {
                        self::fail('Nomor baris tidak valid atau terlalu banyak baris kosong.');
                    }
                    $seen[$number] = true;
                    foreach ($path->query('s:c', $row) as $cell) {
                        if ($path->query('s:f', $cell)->length) {
                            self::fail('Baris '.$number.': rumus tidak didukung. Salin lalu Tempel sebagai Nilai.');
                        }
                        if (! preg_match('/^([A-Z]{1,3})'.$number.'$/', $cell->getAttribute('r'), $match)) {
                            self::fail('Alamat sel tidak valid.');
                        }
                        $column = 0;
                        foreach (str_split($match[1]) as $letter) {
                            $column = $column * 26 + ord($letter) - 64;
                        }
                        if ($column > 80 || array_key_exists($column - 1, $cells)) {
                            self::fail('Kolom Excel tidak valid.');
                        }
                        $type = $cell->getAttribute('t');
                        $value = $path->evaluate('string(s:v)', $cell);
                        if ($type === 's') {
                            if (! ctype_digit($value) || ! isset($strings[(int) $value])) {
                                self::fail('Teks Excel tidak valid.');
                            }
                            $value = $strings[(int) $value];
                        } elseif ($type === 'inlineStr') {
                            $value = '';
                            foreach ($path->query('s:is//s:t', $cell) as $node) {
                                $value .= $node->textContent;
                            }
                        } elseif ($type === 'e') {
                            self::fail('Baris '.$number.': terdapat kesalahan Excel.');
                        }
                        if (strlen($value) > 80000) {
                            self::fail('Isi sel terlalu panjang.');
                        }
                        $cells[$column - 1] = $value;
                    }
                    if (! array_filter($cells, fn ($value) => trim($value) !== '')) {
                        continue;
                    }
                    if (in_array($row->getAttribute('hidden'), ['1', 'true'], true)) {
                        self::fail('Tampilkan dahulu baris tersembunyi pada sheet Data.');
                    }
                    $rows[$number] = $cells;
                    if (count($rows) > $limit) {
                        self::fail('Maksimal 2.000 baris per unggahan.');
                    }
                }
                ksort($rows);

                return $rows;
            };
            $meta = $readSheet('_P3M', 5);
            if (($meta[1][0] ?? '') !== $signature) {
                self::fail('Template tidak sesuai bagian ini. Unduh template dari bagian yang dipilih.');
            }
            $rows = $readSheet('Data', 2001);
            $headers = $rows[1] ?? [];
            unset($rows[1]);
            $mapping = [];
            foreach ($headers as $index => $header) {
                if (! preg_match('/\[([a-zA-Z0-9_.]+)\]\s*\*?$/', $header, $match) || ! isset($columns[$match[1]]) || in_array($match[1], $mapping, true)) {
                    self::fail('Judul kolom berubah. Gunakan judul dari template.');
                }
                $mapping[$index] = $match[1];
            }
            if (count($mapping) !== count($columns)) {
                self::fail('Kolom template tidak lengkap.');
            }
            $result = [];
            foreach ($rows as $number => $cells) {
                foreach ($cells as $index => $value) {
                    if (! isset($mapping[$index]) && trim($value) !== '') {
                        self::fail('Baris '.$number.': terdapat isi di luar kolom template.');
                    }
                }
                $values = [];
                foreach ($mapping as $index => $key) {
                    $values[$key] = trim($cells[$index] ?? '');
                }
                $result[] = ['number' => $number, 'values' => $values];
            }
            if (! $result) {
                self::fail('Sheet Data belum berisi data. Isi mulai baris 2.');
            }

            return ['rows' => $result, 'date1904' => in_array($workbook->evaluate('string(//s:workbookPr/@date1904)'), ['1', 'true'], true)];
        } finally {
            $zip->close();
        }
    }

    public static function template(string $signature, array $columns, string $title, array $settings = []): string
    {
        abort_unless(class_exists(ZipArchive::class), 503, 'Aktifkan ekstensi PHP zip.');
        $escape = fn ($value) => htmlspecialchars((string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $letter = function (int $index): string {
            $name = '';
            do {
                $name = chr(65 + $index % 26).$name;
                $index = intdiv($index, 26) - 1;
            } while ($index >= 0);

            return $name;
        };
        $limit = $settings['maxRows'] ?? 2000;
        $last = $limit + 1;
        $lastColumn = $letter(count($columns) - 1);
        $optionsRows = [];
        $names = [];
        $validations = [];
        $indicators = [];
        $headers = [];
        $examples = [];
        $guide = [
            ['PANDUAN PENGISIAN', $title],
            ['1. Siapkan data', 'Isi sheet Data mulai baris 2. Satu baris untuk satu data. Judul kolom dan sheet _P3M jangan diubah.'],
            ['2. Lihat contoh', 'Sheet Contoh hanya menunjukkan format isian, bukan data sebenarnya. Ganti dengan data Anda. Sheet Contoh tidak ikut diimpor.'],
            ['3. Ikuti petunjuk sel', 'Klik sel pada sheet Data untuk membaca petunjuk. Gunakan dropdown jika tersedia. Kolom bertanda * wajib diisi. Sel merah menandai isian yang perlu diperbaiki.'],
            ['4. Periksa sebelum menyimpan', 'Unggah kembali .xlsx ke CMS. Kesalahan ditampilkan menurut baris dan kolom. Seluruh kesalahan harus diperbaiki sebelum konfirmasi. Menyalin-tempel dapat melewati peringatan Excel, sehingga pemeriksaan CMS tetap diperlukan.'],
            ['5. Hasil impor', ($settings['inline'] ?? false) ? 'Hasil tambah atau ganti data masuk ke draf editor. Periksa hasilnya, lalu klik Simpan pada editor. Impor ini tidak langsung menerbitkan halaman.' : 'Pilih Tambah untuk mempertahankan data lama, atau Ganti untuk mengganti data pada cakupan yang ditampilkan CMS. Periksa jumlah dan cakupan sebelum konfirmasi. Baris identik dilewati.'],
            ['Batas dan urutan', 'Maksimal '.$limit.' baris per unggahan, ukuran 10 MB. Urutan mengikuti baris Excel, kemudian ditambahkan setelah data lama. Batas total daftar di editor tetap berlaku.'],
            ['Format isian', 'Jangan gunakan rumus. Gunakan Tempel sebagai Nilai. Angka tanpa Rp atau pemisah ribuan. Tanggal YYYY-MM-DD. Jam HH:MM. Alt+Enter untuk baris baru dalam satu sel.'],
            ['Tautan berkas', 'Excel berisi alamat berkas, bukan lampiran. Unggah gambar/PDF lewat CMS terlebih dahulu lalu salin alamatnya. Alamat internal harus tersedia.'],
        ];
        if (isset($columns['published'])) {
            $guide[] = ['Status tampil', 'Ya = tampil di situs setelah konfirmasi impor. Tidak atau kosong = draf, belum tampil. Sel kuning pada kolom Tampil berarti draf. Ini sejalan dengan pilihan publikasi pada formulir CMS.'];
        }
        if (! empty($settings['scope'])) {
            $guide[] = ['Tujuan data', 'Template ini khusus untuk bagian yang dipilih: '.implode(', ', $settings['scope']).'. Jangan memakai template ini untuk bagian lain.'];
        }
        $guideHeading = count($guide);
        $guide[] = ['Kolom pada sheet Data', 'Ketentuan pengisian dan contoh'];
        foreach ($columns as $key => $column) {
            $index = count($headers);
            $cell = $letter($index).'2';
            $range = $letter($index).'2:'.$letter($index).$last;
            $required = ! empty($column['required']);
            $headers[] = $column['label']."\n".($required ? 'Wajib' : 'Opsional')."\n[".$key.']'.($required ? ' *' : '');
            $examples[] = $column['example'] ?? 'Isi sesuai data Anda';
            $help = $column['help'] ?? 'Isi sesuai judul kolom.';
            $blank = $column['blank'] ?? ($required ? 'Tidak boleh kosong.' : 'Dibiarkan kosong.');
            $guide[] = [$letter($index).'. '.$column['label'].($required ? ' *' : ''), ($required ? 'Wajib diisi.' : 'Opsional.')."\n".$help."\nContoh: ".($column['example'] ?? '')."\nJika kosong: ".$blank];
            $options = $column['type'] === 'boolean' ? ['Ya', 'Tidak'] : ($column['options'] ?? []);
            if ($options) {
                $choiceName = 'P3MChoice'.($index + 1);
                $names[] = '<definedName name="'.$choiceName.'">'.$escape("'_Pilihan'!$".$letter($index).'$1:$'.$letter($index).'$'.count($options)).'</definedName>';
                foreach ($options as $row => $option) {
                    $optionsRows[$row][$index] = $option;
                }
                $type = 'list';
                $formula = $choiceName;
                $valid = ($required ? 'AND(LEN(TRIM('.$cell.'&""))>0,' : 'OR('.$cell.'="",').'COUNTIF('.$choiceName.','.$cell.')>0)';
            } else {
                $type = 'custom';
                $formula = ExcelColumnGuide::formula($cell, $column);
                $valid = $formula;
            }
            $prompt = ($required ? 'Wajib. ' : 'Opsional. ').'Jika kosong: '.$blank.' '.$help;
            $errorText = $options ? 'Pilih salah satu: '.implode(', ', $options).'.' : $help;
            $suffix = ' Baca sheet Panduan.';
            if (mb_strlen($errorText) > 220 - mb_strlen($suffix)) {
                $errorText = mb_substr($errorText, 0, 216 - mb_strlen($suffix)).'...';
            }
            $validations[] = '<dataValidation type="'.$type.'" errorStyle="stop" allowBlank="'.($required ? '0' : '1').'" showInputMessage="1" showErrorMessage="1" promptTitle="'.$escape(mb_substr($column['label'], 0, 32)).'" prompt="'.$escape(mb_substr($prompt, 0, 255)).'" errorTitle="Periksa isian kolom" error="'.$escape($errorText.$suffix).'" sqref="'.$range.'"><formula1>'.$escape($formula).'</formula1></dataValidation>';
            $indicators[] = '<conditionalFormatting sqref="'.$range.'"><cfRule type="expression" dxfId="0" priority="'.(count($indicators) + 1).'" stopIfTrue="1"><formula>'.$escape('AND(COUNTA($A2:$'.$lastColumn.'2)>0,NOT(IFERROR('.$valid.',FALSE)))').'</formula></cfRule></conditionalFormatting>';
            if ($key === 'published') {
                $indicators[] = '<conditionalFormatting sqref="'.$range.'"><cfRule type="expression" dxfId="1" priority="'.(count($indicators) + 1).'"><formula>'.$escape('AND(COUNTA($A2:$'.$lastColumn.'2)>0,OR('.$cell.'="",LOWER('.$cell.')="tidak"))').'</formula></cfRule></conditionalFormatting>';
            }
        }
        $sheet = function (array $rows, string $kind) use ($escape, $letter, $columns, $validations, $indicators, $guideHeading): string {
            $data = $kind === 'data';
            $guide = $kind === 'guide';
            $widths = $guide ? [38, 100] : array_map(fn ($column) => in_array($column['type'], ['integer', 'number', 'boolean', 'date', 'time'], true) ? 25 : 38, array_values($columns));
            $xml = '<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"'.($guide ? ' tabSelected="1"' : '').'><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="30"/><cols>';
            foreach ($widths as $i => $width) {
                $xml .= '<col min="'.($i + 1).'" max="'.($i + 1).'" width="'.$width.'" customWidth="1" style="1"/>';
            }
            $xml .= '</cols><sheetData>';
            foreach ($rows as $r => $values) {
                $header = $kind !== 'choices' && ($r === 0 || ($guide && $r === $guideHeading));
                $height = $header ? ($guide ? 36 : 105) : ($guide ? 108 : 70);
                $xml .= '<row r="'.($r + 1).'" ht="'.$height.'" customHeight="1">';
                foreach ($values as $c => $value) {
                    $xml .= '<c r="'.$letter($c).($r + 1).'" t="inlineStr" s="'.($header ? 2 : 1).'"><is><t xml:space="preserve">'.$escape($value).'</t></is></c>';
                }
                $xml .= '</row>';
            }
            $xml .= '</sheetData>';
            if ($data) {
                $xml .= implode('', $indicators).'<dataValidations count="'.count($validations).'">'.implode('', $validations).'</dataValidations>';
            }

            return $xml.'</worksheet>';
        };
        $path = tempnam(sys_get_temp_dir(), 'p3m-xlsx-');
        $zip = new ZipArchive;
        if ($zip->open($path, ZipArchive::OVERWRITE) !== true) {
            throw new \RuntimeException('Template belum dapat dibuat.');
        }
        $ns = 'http://schemas.openxmlformats.org/package/2006/relationships';
        $relation = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/';
        $sheetIds = [1, 2, 3, 4, 5];
        $zip->addFromString('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'.implode('', array_map(fn ($i) => '<Override PartName="/xl/worksheets/sheet'.$i.'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>', $sheetIds)).'</Types>');
        $zip->addFromString('_rels/.rels', '<Relationships xmlns="'.$ns.'"><Relationship Id="rId1" Type="'.$relation.'officeDocument" Target="xl/workbook.xml"/></Relationships>');
        $zip->addFromString('xl/workbook.xml', '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="'.rtrim($relation, '/').'"><bookViews><workbookView activeTab="1"/></bookViews><sheets><sheet name="Data" sheetId="1" r:id="rId1"/><sheet name="Panduan" sheetId="2" r:id="rId2"/><sheet name="_P3M" sheetId="3" state="hidden" r:id="rId3"/><sheet name="Contoh" sheetId="4" r:id="rId4"/><sheet name="_Pilihan" sheetId="5" state="hidden" r:id="rId5"/></sheets>'.($names ? '<definedNames>'.implode('', $names).'</definedNames>' : '').'</workbook>');
        $zip->addFromString('xl/_rels/workbook.xml.rels', '<Relationships xmlns="'.$ns.'">'.implode('', array_map(fn ($i) => '<Relationship Id="rId'.$i.'" Type="'.$relation.'worksheet" Target="worksheets/sheet'.$i.'.xml"/>', $sheetIds)).'<Relationship Id="rId6" Type="'.$relation.'styles" Target="styles.xml"/></Relationships>');
        $zip->addFromString('xl/styles.xml', '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF173F64"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top" wrapText="1"/></xf><xf fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1"><alignment vertical="center" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="2"><dxf><font><color rgb="FF9C0006"/></font><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/></patternFill></fill></dxf><dxf><font><color rgb="FF805E17"/></font><fill><patternFill patternType="solid"><fgColor rgb="FFFFF3D9"/></patternFill></fill></dxf></dxfs></styleSheet>');
        $zip->addFromString('xl/worksheets/sheet1.xml', $sheet([$headers, ...($settings['records'] ?? [])], 'data'));
        $zip->addFromString('xl/worksheets/sheet2.xml', $sheet($guide, 'guide'));
        $zip->addFromString('xl/worksheets/sheet3.xml', $sheet([[$signature]], 'meta'));
        $zip->addFromString('xl/worksheets/sheet4.xml', $sheet([$headers, $examples, ['Contoh format saja. Isi data sebenarnya pada sheet Data. Sheet ini tidak diimpor.']], 'example'));
        $zip->addFromString('xl/worksheets/sheet5.xml', $sheet($optionsRows, 'choices'));
        $zip->close();

        return $path;
    }
}
