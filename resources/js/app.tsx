import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';

createInertiaApp({
    title: (title) => title ? title + '. P3M PNM' : 'P3M Politeknik Negeri Madiun',
    progress: { color: '#1e63b8' },
});
