<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class OrganisationScene
{
    private static function fail(string $message = 'Data bagan tidak valid.'): never
    {
        throw ValidationException::withMessages(['content' => $message]);
    }

    private static function object(mixed $value, array $keys): void
    {
        if (! is_array($value) || array_diff(array_keys($value), $keys) || array_diff($keys, array_keys($value))) {
            self::fail();
        }
    }

    private static function number(mixed $value, float $min, float $max): void
    {
        if ((! is_int($value) && ! is_float($value)) || ! is_finite((float) $value) || $value < $min || $value > $max) {
            self::fail('Posisi atau ukuran bagan di luar batas.');
        }
    }

    private static function choice(mixed $value, array $values): void
    {
        if (! in_array($value, $values, true)) {
            self::fail();
        }
    }

    public static function validate(array $scene): void
    {
        self::object($scene, ['version', 'width', 'height', 'institution', 'heading', 'headingX', 'nodes', 'edges']);
        if ($scene['version'] !== 1 || ! is_bool($scene['institution']) || ! is_string($scene['heading']) || mb_strlen($scene['heading']) > 500) {
            self::fail();
        }
        self::number($scene['width'], 320, 12000);
        self::number($scene['height'], 240, 12000);
        self::number($scene['headingX'], 0, 12000);
        foreach (['nodes' => 200, 'edges' => 500] as $key => $limit) {
            if (! is_array($scene[$key]) || ! array_is_list($scene[$key]) || count($scene[$key]) > $limit) {
                self::fail('Jumlah elemen bagan melebihi batas.');
            }
        }
        $ids = [];
        $unique = function (mixed $id) use (&$ids): void {
            if (! is_string($id) || ! preg_match('/^[-a-zA-Z0-9_:]{1,100}$/D', $id) || isset($ids[$id])) {
                self::fail('Identitas elemen bagan tidak valid atau berulang.');
            }
            $ids[$id] = true;
        };
        $cellIds = [];
        foreach ($scene['nodes'] as $node) {
            self::object($node, ['id', 'x', 'y', 'columns', 'rows', 'shape', 'dark', 'cells']);
            $unique($node['id']);
            self::number($node['x'], 0, 12000);
            self::number($node['y'], 0, 12000);
            self::choice($node['shape'], ['rectangle', 'ellipse']);
            if (! is_bool($node['dark'])) {
                self::fail();
            }
            foreach (['rows', 'columns'] as $axis) {
                if (! is_array($node[$axis]) || ! array_is_list($node[$axis]) || count($node[$axis]) < 1 || count($node[$axis]) > 12) {
                    self::fail('Maksimal 12 baris dan 12 kolom per kelompok.');
                }
                foreach ($node[$axis] as $size) {
                    self::number($size, 10, 2000);
                }
            }
            if ($node['x'] + array_sum($node['columns']) > $scene['width'] || $node['y'] + array_sum($node['rows']) > $scene['height']) {
                self::fail('Ada kotak di luar frame. Perbesar frame atau geser kotak ke dalam.');
            }
            if (! is_array($node['cells']) || ! array_is_list($node['cells']) || count($node['cells']) > 144) {
                self::fail();
            }
            $grid = [];
            foreach ($node['cells'] as $cell) {
                self::object($cell, ['id', 'row', 'column', 'rowSpan', 'colSpan', 'text', 'fontSize', 'bold', 'align']);
                $unique($cell['id']);
                $cellIds[$cell['id']] = true;
                if (! is_string($cell['text']) || trim($cell['text']) === '' || mb_strlen($cell['text']) > 4000 || ! is_bool($cell['bold'])) {
                    self::fail('Isi tulisan setiap sel, maksimal 4000 karakter.');
                }
                self::number($cell['fontSize'], 8, 40);
                self::choice($cell['align'], ['left', 'center']);
                foreach (['row', 'column', 'rowSpan', 'colSpan'] as $key) {
                    if (! is_int($cell[$key])) {
                        self::fail();
                    }
                }
                if ($cell['row'] < 0 || $cell['column'] < 0 || $cell['rowSpan'] < 1 || $cell['colSpan'] < 1 || $cell['row'] + $cell['rowSpan'] > count($node['rows']) || $cell['column'] + $cell['colSpan'] > count($node['columns'])) {
                    self::fail();
                }
                for ($r = $cell['row']; $r < $cell['row'] + $cell['rowSpan']; $r++) {
                    for ($c = $cell['column']; $c < $cell['column'] + $cell['colSpan']; $c++) {
                        $key = $r.':'.$c;
                        if (isset($grid[$key])) {
                            self::fail('Sel bertumpuk.');
                        }
                        $grid[$key] = true;
                    }
                }
            }
            if (count($grid) !== count($node['rows']) * count($node['columns'])) {
                self::fail('Ada ruang kosong pada kotak gabungan.');
            }
        }
        foreach ($scene['edges'] as $edge) {
            self::object($edge, ['id', 'kind', 'pattern', 'startMarker', 'endMarker', 'points', 'source', 'target']);
            $unique($edge['id']);
            self::choice($edge['kind'], ['command', 'coordination']);
            self::choice($edge['pattern'], ['solid', 'dashed', 'dotted']);
            foreach (['startMarker', 'endMarker'] as $key) {
                self::choice($edge[$key], ['none', 'arrow', 'dot']);
            }
            if (! is_array($edge['points']) || ! array_is_list($edge['points']) || count($edge['points']) < 2 || count($edge['points']) > 40) {
                self::fail('Garis memerlukan 2 sampai 40 titik.');
            }
            foreach ($edge['points'] as $point) {
                self::object($point, ['x', 'y']);
                self::number($point['x'], 0, $scene['width']);
                self::number($point['y'], 0, $scene['height']);
            }
            foreach (['source', 'target'] as $key) {
                $anchor = $edge[$key];
                if ($anchor === null) {
                    continue;
                }
                self::object($anchor, ['cellId', 'side', 'ratio']);
                if (! is_string($anchor['cellId']) || ! isset($cellIds[$anchor['cellId']])) {
                    self::fail('Garis menunjuk kotak yang sudah dihapus.');
                }
                self::choice($anchor['side'], ['top', 'right', 'bottom', 'left']);
                self::number($anchor['ratio'], 0, 1);
            }
            if ($edge['source'] !== null && $edge['target'] !== null && $edge['source']['cellId'] === $edge['target']['cellId']) {
                self::fail('Hubungkan dua sel yang berbeda.');
            }
        }
        if (strlen(json_encode($scene, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR)) > 450000) {
            self::fail('Bagan terlalu besar.');
        }
    }
}
