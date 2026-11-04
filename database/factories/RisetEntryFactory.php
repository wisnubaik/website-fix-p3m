<?php

namespace Database\Factories;

use App\Models\RisetEntry;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<RisetEntry> */
class RisetEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category' => 'penelitian-internal', 'year' => '2026', 'title' => fake()->sentence(),
            'leader' => fake()->name(), 'member1' => null, 'member2' => null,
            'funding' => 12500000, 'order' => 0, 'published' => true,
        ];
    }
}
