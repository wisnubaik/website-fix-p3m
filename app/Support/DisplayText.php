<?php

namespace App\Support;

use Illuminate\Contracts\Support\Arrayable;
use JsonSerializable;
use stdClass;

class DisplayText
{
    private const TEXT_KEYS = [
        'title', 'name', 'nama', 'meta', 'text', 'label', 'lead', 'badge', 'desc', 'description',
        'heading', 'subtitle', 'body', 'caption', 'note', 'intro', 'keterangan', 'judul',
        'institution', 'officeTitle', 'officeDescription', 'address', 'poBox', 'tempat',
        'leader', 'member1', 'member2', 'ketua', 'narasumber', 'mahasiswa', 'prodi',
        'fokus', 'deskripsi', 'ringkasan', 'proyek', 'mitra', 'bidang', 'waktu', 'hasil',
        'belum', 'sudah', 'tag', 'skema', 'groupTitle', 'groupMark', 'detail',
        'message', 'error', 'help', 'placeholder', 'alt', 'ctaPrimaryLabel', 'ctaSecondaryLabel',
        'titleText', 'titleItalicWord', 'emptyLabel', 'confirmationLabel',
    ];

    private const TEXT_CONTAINERS = [
        'fields', 'collections', 'blocks', 'headers', 'rows', 'items', 'lines', 'runs',
        'richText', 'default', 'defaults', 'optionLabels', 'categories', 'errors', 'flash',
    ];

    public static function clean(string $value): string
    {
        $value = str_replace(['&middot;', '&bull;', '&#183;', '&#8226;'], ' ', $value);
        $value = preg_replace('/[\x{2012}-\x{2015}]/u', '-', $value);
        $value = preg_replace('/^[ \t]*[\x{00B7}\x{2022}]+[ \t]*/mu', '', $value);

        return preg_replace('/[ \t]*[\x{00B7}\x{2022}]+[ \t]*/u', ' ', $value);
    }

    public static function values(mixed $value, string $key = '', bool $text = false): mixed
    {
        if (preg_match('/(?:id|url|href|src|path|password|secret|token|hash|signature|fingerprint|email|subject)$/i', $key)
            || in_array($key, ['key', 'type', 'code', 'scope', 'options', 'action', 'resource', 'section', 'group', 'category', 'metric', 'role', 'kind', 'template', 'acara', 'jurusan', 'sesi', 'phrase', 'confirmation', 'pattern', 'partial', 'component', 'iconName', 'fileName'], true)) {
            return $value;
        }
        if ($value instanceof Arrayable) {
            $value = $value->toArray();
        } elseif ($value instanceof JsonSerializable) {
            $value = $value->jsonSerialize();
        }
        $text = $text || in_array($key, self::TEXT_KEYS, true) || in_array($key, self::TEXT_CONTAINERS, true);
        if (is_array($value) || $value instanceof stdClass) {
            $object = $value instanceof stdClass;
            $result = [];
            foreach ((array) $value as $name => $item) {
                $result[$name] = self::values($item, (string) $name, $text);
            }

            return $object ? (object) $result : $result;
        }
        if (! is_string($value) || preg_match('~^(?:https?://|mailto:|tel:|/|#)~i', $value)) {
            return $value;
        }
        if (in_array($key, ['content', 'details', 'timeline', 'draft', 'published', 'document'], true)) {
            $decoded = json_decode($value);
            if (is_array($decoded) || $decoded instanceof stdClass) {
                return json_encode(self::values($decoded, '', true), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            }
        }

        return $text ? self::clean($value) : $value;
    }
}
