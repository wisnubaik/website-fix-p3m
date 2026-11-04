<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->command?->warn('Konten dan akun P3M dipindahkan melalui php artisan p3m:to-mysql. Seeder tidak menambahkan atau menimpa data.');
    }
}
