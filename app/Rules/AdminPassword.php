<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class AdminPassword implements ValidationRule
{
    public const MIN_LENGTH = 8;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $min = self::MIN_LENGTH;
        if (! is_string($value) || mb_strlen($value) < $min || strlen($value) > 72) {
            $fail("Password minimal {$min} karakter dan maksimal 72 byte.");

            return;
        }
    }
}
