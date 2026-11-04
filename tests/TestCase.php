<?php

namespace Tests;

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use RuntimeException;

abstract class TestCase extends BaseTestCase
{
    public function createApplication(): Application
    {
        $app = parent::createApplication();
        $connection = config('database.default');
        $database = (string) config('database.connections.'.$connection.'.database');
        if ($connection !== 'sqlite' && ! str_ends_with($database, '_testing')) {
            throw new RuntimeException('Pengujian hanya boleh menggunakan database khusus dengan akhiran _testing.');
        }

        return $app;
    }
}
