<?php

namespace App\Support;

use DOMDocument;
use Illuminate\Validation\ValidationException;

class StaticSvg
{
    public static function clean(string $source): string
    {
        $fail = fn (string $reason) => throw ValidationException::withMessages(['file' => $reason]);
        if (strlen($source) > 2 * 1024 * 1024) {
            throw ValidationException::withMessages(['file' => 'Ukuran SVG maksimal 2 MB.']);
        }
        // Legacy SVG exports may declare the standard DTD. Remove it without loading it.
        $source = preg_replace('~<!DOCTYPE\s+svg\s+PUBLIC\s+([\'\"])-//W3C//DTD SVG 1\.[01]//EN\1\s+([\'\"])https?://www\.w3\.org/(?:Graphics/SVG/1\.1/DTD/svg11\.dtd|TR/2001/REC-SVG-20010904/DTD/svg10\.dtd)\2\s*>~i', '', $source);
        if (preg_match('/<!DOCTYPE|<!ENTITY/i', $source)) {
            $fail('SVG memuat DTD atau entity khusus yang tidak didukung. Ekspor ulang tanpa DTD khusus.');
        }
        $doc = new DOMDocument;
        if (! @$doc->loadXML($source, LIBXML_NONET) || $doc->documentElement?->localName !== 'svg') {
            $fail('Isi berkas bukan dokumen SVG yang valid. Ekspor ulang sebagai SVG dari aplikasi desain.');
        }
        if ($doc->getElementsByTagName('*')->length > 20000) {
            $fail('SVG terlalu kompleks (lebih dari 20.000 elemen). Sederhanakan gambar sebelum diunggah.');
        }
        $xpath = new \DOMXPath($doc);
        $xpath->registerNamespace('svg', 'http://www.w3.org/2000/svg');
        $editorNamespaces = ['http://www.inkscape.org/namespaces/inkscape', 'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd', 'http://ns.adobe.com/AdobeIllustrator/10.0/', 'http://ns.adobe.com/AdobeSVGViewerExtensions/3.0/'];
        foreach ($xpath->query('//svg:metadata | //processing-instruction() | //comment()') as $node) {
            $node->parentNode?->removeChild($node);
        }
        foreach (iterator_to_array($doc->getElementsByTagName('*')) as $node) {
            if (in_array($node->namespaceURI, $editorNamespaces, true)) {
                $node->parentNode?->removeChild($node);
            }
        }
        $elements = ['svg', 'g', 'defs', 'path', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'text', 'tspan', 'textPath', 'title', 'desc', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'pattern', 'use', 'symbol', 'marker', 'view', 'switch', 'filter', 'feGaussianBlur', 'feOffset', 'feBlend', 'feColorMatrix', 'feComposite', 'feFlood', 'feMerge', 'feMergeNode', 'feDropShadow', 'feComponentTransfer', 'feFuncR', 'feFuncG', 'feFuncB', 'feFuncA', 'feTurbulence', 'feDisplacementMap', 'feMorphology', 'feTile', 'feConvolveMatrix', 'feDiffuseLighting', 'feSpecularLighting', 'feDistantLight', 'fePointLight', 'feSpotLight', 'style', 'animate', 'animateTransform'];
        $animatedAttributes = ['opacity', 'visibility', 'fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width', 'stroke-dasharray', 'stroke-dashoffset', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'width', 'height', 'd', 'points', 'offset', 'stop-color', 'stop-opacity'];
        foreach ($doc->getElementsByTagName('*') as $node) {
            if (! in_array($node->localName, $elements, true) || $node->namespaceURI !== 'http://www.w3.org/2000/svg') {
                $fail('Elemen SVG <'.$node->nodeName.'> belum didukung. Gunakan SVG tanpa script, objek HTML, atau gambar tertanam; alternatifnya ekspor sebagai PNG/WebP.');
            }
            if ($node->localName === 'animate' && ! in_array($node->getAttribute('attributeName'), $animatedAttributes, true)) {
                $fail('Animasi SVG hanya boleh mengubah bentuk, warna, atau ukuran; perubahan tautan dan atribut interaktif tidak didukung.');
            }
            if ($node->localName === 'animateTransform' && ($node->getAttribute('attributeName') !== 'transform' || ! in_array($node->getAttribute('type'), ['translate', 'scale', 'rotate', 'skewX', 'skewY'], true))) {
                $fail('Jenis transformasi animasi SVG belum didukung.');
            }
            foreach (iterator_to_array($node->attributes) as $attribute) {
                if (in_array($attribute->namespaceURI, $editorNamespaces, true)) {
                    $node->removeAttributeNode($attribute);

                    continue;
                }
                $name = strtolower($attribute->localName);
                $value = trim($attribute->value);
                if ($name === 'style') {
                    $value = preg_replace('~/\*.*?\*/~s', '', $value);
                    $attribute->value = $value;
                }
                if (str_starts_with($name, 'on') || in_array($name, ['src', 'base'], true)
                    || ($name === 'href' && ! preg_match('/^#[a-zA-Z_][\w:.-]*$/', $value))
                    || ! self::safeCssValue($value)) {
                    $fail('Atribut SVG "'.$attribute->nodeName.'" memuat script atau referensi yang tidak diizinkan. Gunakan referensi lokal di dalam gambar.');
                }
            }
            if ($node->localName === 'style') {
                $style = preg_replace('~/\*.*?\*/~s', '', $node->textContent);
                if (! self::safeCssValue($style)) {
                    $fail('Style SVG memuat sumber eksternal atau aturan yang tidak diizinkan. Ekspor dengan font dan gaya lokal.');
                }
                $node->textContent = $style;
            }
        }

        return $doc->saveXML($doc->documentElement);
    }

    private static function safeCssValue(string $value): bool
    {
        if (preg_match('/[\\\\\x00]|@import|@font-face|expression\s*\(|javascript:|data:|\/\*/i', $value)) {
            return false;
        }
        $localOnly = preg_replace('/url\(\s*[\'\"]?#[a-zA-Z_][\w:.-]*[\'\"]?\s*\)/i', '', $value);

        return ! preg_match('/url\s*\(/i', $localOnly);
    }
}
