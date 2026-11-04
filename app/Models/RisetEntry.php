<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class RisetEntry extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $table = 'RisetEntry';

    public const CREATED_AT = 'createdAt';

    public const UPDATED_AT = 'updatedAt';

    public const DELETED_AT = 'deletedAt';

    public const CATEGORIES = [
        'penelitian-internal' => 'Penelitian Internal', 'penelitian-eksternal' => 'Penelitian Eksternal',
        'penelitian-unggulan' => 'Penelitian Unggulan', 'pkm-internal' => 'PkM Internal',
        'pkm-eksternal' => 'PkM Eksternal', 'pkm-unggulan' => 'PkM Unggulan',
    ];

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $fillable = ['category', 'year', 'title', 'leader', 'member1', 'member2', 'funding', 'order', 'published'];

    /** Accept existing Prisma/seed IDs as well as newly generated UUIDs. */
    protected function isValidUniqueId($value): bool
    {
        return is_string($value) && preg_match('/^[A-Za-z0-9_-]{1,191}$/D', $value) === 1;
    }

    protected function casts(): array
    {
        return ['published' => 'boolean', 'funding' => 'integer', 'order' => 'integer'];
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('published', true);
    }
}
