<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;

class Admin extends Authenticatable
{
    use HasFactory, HasUuids;

    protected $table = 'Admin';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $fillable = ['email', 'name', 'passwordHash', 'role', 'isActive', 'mustChangePassword', 'sessionVersion', 'tempPasswordExpiresAt'];

    protected $hidden = ['passwordHash', 'remember_token', 'googleSubject'];

    public function getAuthPasswordName(): string
    {
        return 'passwordHash';
    }

    protected function casts(): array
    {
        return [
            'isActive' => 'boolean', 'mustChangePassword' => 'boolean', 'sessionVersion' => 'integer',
            'tempPasswordExpiresAt' => 'datetime', 'lastLoginAt' => 'datetime', 'passwordChangedAt' => 'datetime',
        ];
    }
}
