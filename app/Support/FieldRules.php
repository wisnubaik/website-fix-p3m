<?php

namespace App\Support;

use Closure;
use Illuminate\Validation\ValidationException;

class FieldRules
{
    public static function catalog(): array
    {
        static $catalog;

        return $catalog ??= json_decode(file_get_contents(resource_path('js/lib/field-rules.json')), true, flags: JSON_THROW_ON_ERROR);
    }

    public static function policy(string $resource, string $key, ?string $type = null): string
    {
        $catalog = self::catalog();

        return $catalog['fields'][$resource][$key] ?? $catalog['common'][$key]
            ?? ($type === 'Int' ? 'integer' : 'text');
    }

    public static function labelPolicy(string $label): string
    {
        return self::catalog()['labels'][mb_strtolower(trim($label))] ?? 'text';
    }

    public static function rule(string $policy): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($policy) {
            if ($message = self::error($policy, $value)) {
                $fail($message);
            }
        };
    }

    public static function error(string $policy, mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $rule = self::catalog()['rules'][$policy] ?? self::catalog()['rules']['text'];
        if (! is_string($value) && ! is_int($value)) {
            return $rule['help'];
        }
        $value = (string) $value;
        if (preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u', $value)) {
            return 'Karakter kontrol tidak diperbolehkan.';
        }
        if (mb_strlen($value) > $rule['max']) {
            return 'Maksimal '.$rule['max'].' karakter. '.$rule['help'];
        }
        if (isset($rule['pattern']) && ! preg_match('~'.str_replace('~', '\\~', $rule['pattern']).'~uD', $value)) {
            return $rule['help'];
        }
        if (isset($rule['maxValue']) && ((float) $value > $rule['maxValue'] || (float) $value < $rule['minValue'])) {
            return $rule['help'];
        }
        if ($policy === 'phone' && strlen(preg_replace('/\D/', '', $value)) < 6) {
            return 'Nomor telepon harus memiliki sedikitnya 6 digit.';
        }
        if ($policy === 'email' && ! filter_var($value, FILTER_VALIDATE_EMAIL)) {
            return $rule['help'];
        }

        return null;
    }

    public static function check(string $policy, mixed $value, string $key): void
    {
        if ($message = self::error($policy, $value)) {
            throw ValidationException::withMessages([$key => $message]);
        }
    }

    public static function textTree(mixed $value, string $path = 'body'): void
    {
        if (is_array($value)) {
            foreach ($value as $key => $entry) {
                self::textTree($entry, $path.'.'.$key);
            }
        } elseif (is_string($value) && preg_match('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/u', $value)) {
            throw ValidationException::withMessages([$path => 'Karakter kontrol tidak diperbolehkan.']);
        }
    }

    public static function values(string $resource, array $data, array $schema = []): void
    {
        self::textTree($data);
        foreach ($data as $key => $value) {
            $policy = self::policy($resource, $key, $schema[$key]['type'] ?? null);
            if ($policy !== 'text') {
                self::check($policy, $value, $key);
            }
            if ($key === 'details' && is_string($value)) {
                $pairs = json_decode($value, true);
                foreach (is_array($pairs) ? $pairs : [] as $pair) {
                    if (is_array($pair) && array_is_list($pair) && count($pair) === 2 && is_string($pair[0])) {
                        self::check(self::labelPolicy($pair[0]), $pair[1], 'details');
                    }
                }
            }
        }
    }
}
