<?php

namespace Database\Factories;

use App\Models\Admin;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/** @extends Factory<Admin> */
class AdminFactory extends Factory
{
    public function definition(): array
    {
        return [
            'email' => fake()->unique()->safeEmail(), 'name' => fake()->name(),
            'passwordHash' => Hash::make('Orion!River-47-Lantern'),
            'role' => 'ADMIN', 'isActive' => true, 'mustChangePassword' => false, 'sessionVersion' => 0,
        ];
    }
}
