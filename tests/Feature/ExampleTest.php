<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_homepage_loads_with_an_empty_database(): void
    {
        $this->withoutVite();
        config(['inertia.ssr.enabled' => false]);
        $this->get('/')->assertOk();
    }
}
