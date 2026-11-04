<?php

namespace App\Support;

use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class ProfileContent
{
    public static function validate(array $body, bool $yearHeading = false): array
    {
        FieldRules::textTree($body);
        $data = Validator::make($body, [
            'version' => 'required|integer|min:1|max:2147483647',
            'documentUpdatedAt' => 'required|date', 'name' => 'required|string|max:500',
            'groupTitle' => 'required|string|max:300', 'published' => 'required|boolean',
            'groupPosition' => 'sometimes|integer|min:1|max:10000',
            'order' => 'required|integer|min:0|max:2147483647',
            'content' => 'required|array:tables', 'content.tables' => 'present|array|max:12',
            'content.tables.*' => 'required|array:title,caption,intro,note,numeric,headers,rows,rowRoles,supportLinks,connections,diagram',
            'content.tables.*.diagram' => 'sometimes|array',
            'content.tables.*.connections' => 'sometimes|array|max:500',
            'content.tables.*.rowRoles' => 'sometimes|array|max:80',
            'content.tables.*.supportLinks' => 'sometimes|array|max:41',
            'content.tables.*.title' => 'present|string|max:500',
            'content.tables.*.caption' => 'required|string|max:500',
            'content.tables.*.intro' => 'present|string|max:4000',
            'content.tables.*.note' => 'present|string|max:4000',
            'content.tables.*.numeric' => 'required|boolean',
            'content.tables.*.headers' => 'required|array|min:2|max:12',
            'content.tables.*.headers.*' => 'required|string|max:300',
            'content.tables.*.rows' => 'present|array|max:80',
        ])->validate();
        foreach ($data['content']['tables'] as $table) {
            if (! is_bool($table['numeric']) || ! array_is_list($table['headers']) || ! array_is_list($table['rows'])) {
                self::invalid();
            }
            if (array_key_exists('diagram', $table)) {
                if ($table['numeric'] || count($table['headers']) !== 2) {
                    self::invalid();
                }
                OrganisationScene::validate($table['diagram']);
            }
            if (array_key_exists('rowRoles', $table)) {
                $roles = ['leader', 'operator', 'groups', 'council', 'inspection', 'department', 'administration', 'centres', 'support', 'functional', 'other'];
                if ($table['numeric'] || count($table['headers']) !== 2 || ! is_array($table['rowRoles']) || ! array_is_list($table['rowRoles']) || count($table['rowRoles']) !== count($table['rows'])) {
                    self::invalid();
                }
                foreach ($table['rowRoles'] as $role) {
                    if (! in_array($role, $roles, true)) {
                        self::invalid();
                    }
                }
            }
            if ($table['numeric']) {
                $previous = 0;
                foreach (array_slice($table['headers'], 1) as $year) {
                    if (! preg_match('/^(19|20)\d{2}$/', $year) || (int) $year <= $previous) {
                        self::invalid();
                    }
                    $previous = (int) $year;
                }
            }
            foreach ($table['rows'] as $row) {
                if (! is_array($row) || ! array_is_list($row) || count($row) !== count($table['headers'])) {
                    self::invalid();
                }
                foreach ($row as $column => $cell) {
                    if ($table['numeric'] && $column > 0) {
                        if ($cell !== null && (! is_int($cell) || $cell < 0 || $cell > 2147483647)) {
                            self::invalid();
                        }
                    } else {
                        $cell = Validator::make(['cell' => $cell], [
                            'cell' => 'required|array:text,items,ordered', 'cell.text' => 'present|string|max:4000',
                            'cell.items' => 'present|array|max:40', 'cell.items.*' => 'required|string|max:2000',
                            'cell.ordered' => 'required|boolean',
                        ])->validate()['cell'];
                        $policy = FieldRules::labelPolicy($table['headers'][$column]);
                        if ($yearHeading && $column === 0) {
                            if (! preg_match('/^((?:19|20)\d{2})\s+(\S[\s\S]*)$/u', $cell['text'], $parts)) {
                                self::invalid();
                            }
                            FieldRules::check('year', $parts[1], 'content');
                            FieldRules::check('text', $parts[2], 'content');
                            $policy = 'text';
                        } else {
                            FieldRules::check($policy, $cell['text'], 'content');
                        }
                        foreach ($cell['items'] as $item) {
                            FieldRules::check($policy, $item, 'content');
                        }
                        if (! is_bool($cell['ordered']) || ! array_is_list($cell['items']) || (! trim($cell['text']) && ! count($cell['items']))) {
                            self::invalid();
                        }
                    }
                }
            }
            if (array_key_exists('connections', $table)) {
                if ($table['numeric'] || count($table['headers']) !== 2 || ! is_array($table['connections']) || ! array_is_list($table['connections']) || count($table['connections']) > 500) {
                    self::invalid();
                }
                $nodes = [];
                foreach ($table['rows'] as $rowIndex => $row) {
                    $role = $table['rowRoles'][$rowIndex] ?? (preg_match('/^jurusan\b/i', $row[0]['text']) ? 'department' : (preg_match('/^administrasi (akademik|umum)$/i', $row[0]['text']) ? 'administration' : 'other'));
                    if (in_array($role, ['department', 'administration'], true)) {
                        $nodes[$rowIndex.':h'] = true;
                    }
                    $count = count($row[1]['items']) + ($row[1]['text'] !== '' ? 1 : 0);
                    for ($entry = 0; $entry < $count; $entry++) {
                        $nodes[$rowIndex.':'.$entry] = true;
                    }
                }
                $parents = [];
                foreach ($table['connections'] as $link) {
                    if (! is_array($link) || count($link) !== 2 || ! isset($link['from'], $link['to']) || ! is_string($link['from']) || ! is_string($link['to']) || ! isset($nodes[$link['from']], $nodes[$link['to']]) || $link['from'] === $link['to'] || isset($parents[$link['to']])) {
                        throw ValidationException::withMessages(['content' => 'Hubungan panah tidak valid. Pilih kotak yang tersedia; setiap tujuan hanya memiliki satu induk.']);
                    }
                    $parents[$link['to']] = $link['from'];
                }
                foreach (array_keys($nodes) as $node) {
                    $seen = [];
                    while (isset($parents[$node])) {
                        if (isset($seen[$node])) {
                            throw ValidationException::withMessages(['content' => 'Hubungan panah tidak boleh membentuk lingkaran.']);
                        }
                        $seen[$node] = true;
                        $node = $parents[$node];
                    }
                }
            }
            if (array_key_exists('supportLinks', $table)) {
                if (! isset($table['rowRoles']) || ! is_array($table['supportLinks']) || ! array_is_list($table['supportLinks']) || count($table['supportLinks']) > 41) {
                    self::invalid();
                }
                $size = function (string $role) use ($table): int {
                    $index = array_search($role, $table['rowRoles'], true);
                    if ($index === false) {
                        return 0;
                    }
                    $cell = $table['rows'][$index][1];

                    return count($cell['items']) + ($cell['text'] !== '' ? 1 : 0);
                };
                $seen = [];
                $leaders = [];
                foreach ($table['supportLinks'] as $link) {
                    if (! is_array($link) || count($link) !== 2 || ! isset($link['leader'], $link['units']) || ! is_int($link['leader']) || $link['leader'] < 0 || $link['leader'] >= $size('leader') || in_array($link['leader'], $leaders, true) || ! is_array($link['units']) || ! array_is_list($link['units']) || count($link['units']) === 0) {
                        self::invalid();
                    }
                    $leaders[] = $link['leader'];
                    foreach ($link['units'] as $unit) {
                        if (! is_int($unit) || $unit < 0 || $unit >= $size('support') || in_array($unit, $seen, true)) {
                            self::invalid();
                        }
                        $seen[] = $unit;
                    }
                }
            }
        }
        if (! is_bool($data['published']) || ! array_is_list($data['content']['tables'])) {
            self::invalid();
        }

        return $data;
    }

    private static function invalid(): never
    {
        throw ValidationException::withMessages(['content' => 'Struktur, isi sel, atau urutan tahun tabel tidak valid.']);
    }
}
