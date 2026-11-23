/*
 * Menerjemahkan pesan validasi bawaan browser (gelembung "Please fill out this field.",
 * "Please include an '@'…", dan sejenisnya) ke bahasa Indonesia untuk semua form.
 * Bahasa gelembung itu ditentukan browser, bukan server, sehingga tidak bisa diubah lewat file bahasa Laravel.
 * Ubah teks di fungsi pesan() di bawah sesuai selera.
 */
(function () {
    'use strict';
    var MARK = 'idMsg';

    function pesan(el) {
        var v = el.validity;
        var type = (el.type || '').toLowerCase();
        var value = el.value || '';

        if (v.valueMissing) {
            if (type === 'checkbox') return 'Centang kotak ini terlebih dahulu untuk melanjutkan.';
            if (type === 'radio' || el.tagName === 'SELECT') return 'Pilih salah satu opsi yang tersedia.';
            if (type === 'file') return 'Pilih berkas terlebih dahulu.';
            return 'Isian ini wajib diisi. Lengkapi sebelum melanjutkan.';
        }
        if (v.typeMismatch) {
            if (type === 'email') {
                var at = value.indexOf('@');
                if (at === -1) return 'Alamat email harus memuat tanda "@". Isian "' + value + '" belum memakai "@".';
                if (at === value.length - 1) return 'Lengkapi bagian setelah tanda "@". Isian "' + value + '" belum lengkap.';
                if (at === 0) return 'Tambahkan bagian sebelum tanda "@". Contoh: nama@contoh.ac.id.';
                return 'Masukkan alamat email yang valid. Contoh: nama@contoh.ac.id.';
            }
            if (type === 'url') return 'Masukkan alamat URL yang valid, diawali http:// atau https://.';
            return 'Format isian tidak sesuai.';
        }
        if (v.patternMismatch) return el.title ? 'Format tidak sesuai: ' + el.title : 'Format isian tidak sesuai dengan yang diminta.';
        if (v.tooShort) return 'Isian minimal ' + el.minLength + ' karakter. Saat ini baru ' + value.length + ' karakter.';
        if (v.tooLong) return 'Isian maksimal ' + el.maxLength + ' karakter. Saat ini ' + value.length + ' karakter.';
        if (v.rangeUnderflow) return 'Nilai minimal adalah ' + el.min + '.';
        if (v.rangeOverflow) return 'Nilai maksimal adalah ' + el.max + '.';
        if (v.stepMismatch) return 'Masukkan nilai yang valid. Nilai terdekat yang diterima mengikuti kelipatan ' + (el.step || '1') + '.';
        if (v.badInput) return 'Isian tidak valid. Periksa kembali penulisannya.';
        return '';
    }

    document.addEventListener('invalid', function (event) {
        var el = event.target;
        if (!el || typeof el.setCustomValidity !== 'function') return;
        // Jangan menimpa pesan khusus yang dibuat aplikasi sendiri.
        if (el.validity.customError && !el.dataset[MARK]) return;
        el.setCustomValidity('');
        var text = pesan(el);
        if (text) {
            el.setCustomValidity(text);
            el.dataset[MARK] = '1';
        } else {
            delete el.dataset[MARK];
        }
    }, true);

    function bersihkan(event) {
        var el = event.target;
        if (el && el.dataset && el.dataset[MARK]) {
            el.setCustomValidity('');
            delete el.dataset[MARK];
        }
    }
    document.addEventListener('input', bersihkan, true);
    document.addEventListener('change', bersihkan, true);
})();
