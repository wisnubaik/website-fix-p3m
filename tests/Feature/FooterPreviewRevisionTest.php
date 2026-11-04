<?php

namespace Tests\Feature;

use App\Support\ManagedContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class FooterPreviewRevisionTest extends TestCase
{
    use RefreshDatabase;

    private function document(array $contacts): array
    {
        return ManagedContent::document(['title' => 'Footer', 'description' => '', 'fields' => [], 'collections' => ['footer_social' => $contacts], 'blocks' => [], 'placement' => 'after'], (object) ['path' => '@global']);
    }

    public function test_contacts_accept_familiar_inputs_without_technical_prefixes(): void
    {
        $document = $this->document([
            ['type' => 'email', 'href' => 'p3m@example.com'],
            ['type' => 'phone', 'href' => '(0351) 452970'],
            ['type' => 'instagram', 'href' => '@p3m_pnm'],
            ['type' => 'website', 'href' => 'pnm.ac.id'],
        ]);
        $this->assertSame(['mailto:p3m@example.com', 'tel:0351452970', 'https://instagram.com/p3m_pnm', 'https://pnm.ac.id'], array_column($document['collections']['footer_social'], 'href'));
    }

    public function test_dangerous_contact_links_are_rejected(): void
    {
        $this->expectException(ValidationException::class);
        $this->document([['type' => 'website', 'href' => 'javascript:alert(1)']]);
    }

    public function test_guest_preview_has_an_explanation_without_exposing_the_draft(): void
    {
        $this->withoutVite();
        $this->get('/?cms_preview=1')->assertForbidden()
            ->assertInertia(fn (Assert $page) => $page->component('Public/PreviewUnavailable')->where('publicPath', '/'))
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }
}
