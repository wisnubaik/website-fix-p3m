<?php

namespace App\Http\Controllers;

use App\Support\ManagedContent;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class SiteMetadataController extends Controller
{
    public function sitemap(): Response
    {
        $pages = json_decode(file_get_contents(database_path('page-metadata.json')), true, 512, JSON_THROW_ON_ERROR);
        if (ManagedContent::ready()) {
            $pages = DB::table('managed_pages')->whereNull('deleted_at')->whereNotNull('published')->where('path', '!=', '@global')->pluck('id', 'path')->all();
        }
        $xml = new \SimpleXMLElement('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
        foreach (array_keys($pages) as $path) {
            $url = $xml->addChild('url');
            $url->addChild('loc', htmlspecialchars(rtrim(config('app.url'), '/').$path, ENT_XML1));
            $url->addChild('changefreq', 'monthly');
        }

        return response($xml->asXML(), 200, ['Content-Type' => 'application/xml']);
    }

    public function robots(): Response
    {
        return response("User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api\nSitemap: ".rtrim(config('app.url'), '/')."/sitemap.xml\n", 200, ['Content-Type' => 'text/plain']);
    }
}
