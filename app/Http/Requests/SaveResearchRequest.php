<?php

namespace App\Http\Requests;

use App\Models\RisetEntry;
use App\Support\FieldRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SaveResearchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['ADMIN', 'SUPERADMIN'], true);
    }

    public function rules(): array
    {
        return [
            'category' => ['required', Rule::in(array_keys(RisetEntry::CATEGORIES))],
            'year' => ['required', 'string', 'regex:/^(19|20)\d{2}$/'],
            'title' => ['required', 'string', 'max:10000'],
            'leader' => ['required', 'string', 'max:1000', FieldRules::rule('person')],
            'member1' => ['nullable', 'string', 'max:1000', FieldRules::rule('people')], 'member2' => ['nullable', 'string', 'max:1000', FieldRules::rule('people')],
            'funding' => ['required', 'integer', 'min:0', 'max:2147483647', FieldRules::rule('integer')],
            'order' => ['required', 'integer', 'min:0', 'max:2147483647', FieldRules::rule('integer')],
            'published' => ['required', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator) {
            FieldRules::textTree($this->except(['_token', '_method']));
            $unknown = array_diff(array_keys($this->all()), [...array_keys($this->rules()), '_token', '_method']);
            if ($unknown !== []) {
                $validator->errors()->add('form', 'Field yang tidak diizinkan: '.implode(', ', $unknown));
            }
        }];
    }
}
