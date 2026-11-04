<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('HeroContent', function (Blueprint $table) {
            $table->string('id')->default('hero')->primary();
            $table->text('badge');
            $table->text('titleText');
            $table->text('titleItalicWord')->nullable();
            $table->text('lead');
            $table->text('ctaPrimaryLabel');
            $table->text('ctaPrimaryHref');
            $table->text('ctaSecondaryLabel');
            $table->text('ctaSecondaryHref');
            $table->dateTime('updatedAt', 3);
        });
        Schema::create('ContentListItem', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('section');
            $table->text('text');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('RoadmapItem', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('year');
            $table->text('title');
            $table->text('desc');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('FocusCluster', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('title');
            $table->text('desc');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('SiteSettings', function (Blueprint $table) {
            $table->string('id')->default('settings')->primary();
            $table->text('logoUrl')->nullable();
            $table->text('institution');
            $table->text('officeTitle');
            $table->text('officeDescription');
            $table->text('email');
            $table->text('phone');
            $table->text('fax')->nullable();
            $table->text('instagram');
            $table->text('address');
            $table->text('mapsUrl')->nullable();
            $table->text('poBox')->nullable();
            $table->dateTime('updatedAt', 3);
        });
        Schema::create('QuickAccessLink', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('href');
            $table->text('title');
            $table->text('meta');
            $table->text('accent');
            $table->text('iconName');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('ActivityLog', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('adminId')->nullable();
            $table->text('username');
            $table->text('action');
            $table->text('resource');
            $table->text('detail')->nullable();
            $table->dateTime('createdAt', 3);
            $table->index(['adminId', 'createdAt']);
        });
        Schema::create('HubCard', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('hub');
            $table->text('title');
            $table->text('desc');
            $table->text('href');
            $table->text('accentName');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('Admin', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('email')->unique();
            $table->text('name');
            $table->text('passwordHash');
            $table->string('role');
            $table->boolean('isActive')->default(true);
            $table->boolean('mustChangePassword')->default(false);
            $table->dateTime('tempPasswordExpiresAt', 3)->nullable();
            $table->integer('sessionVersion')->default(0);
            $table->dateTime('lastLoginAt', 3)->nullable();
            $table->dateTime('passwordChangedAt', 3)->nullable();
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->rememberToken();
        });
        Schema::create('DocumentItem', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('section');
            $table->text('groupTitle');
            $table->text('groupMark')->nullable();
            $table->text('name');
            $table->text('kind');
            $table->text('year')->nullable();
            $table->text('category')->nullable();
            $table->text('href')->nullable();
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('ProfileTableContent', function (Blueprint $table) {
            $table->string('documentId')->primary();
            $table->text('content');
            $table->integer('version')->default(1);
            $table->dateTime('updatedAt', 3);
            $table->foreign('documentId')->references('id')->on('DocumentItem')->cascadeOnDelete();
        });
        Schema::create('Announcement', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('num');
            $table->text('tahun')->nullable();
            $table->text('title');
            $table->text('kind');
            $table->text('badge');
            $table->boolean('urgent')->default(false);
            $table->text('href')->nullable();
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('TautanPengusulan', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('label');
            $table->text('href');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('RisetGrup', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('nama');
            $table->text('ketua');
            $table->text('fokus');
            $table->text('deskripsi');
            $table->text('roadmapHref')->nullable();
            $table->text('logoUrl')->nullable();
            $table->integer('anggota')->nullable();
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('TrendStat', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('metric');
            $table->string('year');
            $table->integer('value');
            $table->unique(['metric', 'year']);
        });
        Schema::create('StatEntry', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('group');
            $table->text('label');
            $table->integer('value');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('Winner', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('category');
            $table->text('name');
            $table->text('skema');
            $table->text('tag');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('ArchiveBlock', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('page');
            $table->integer('order')->default(0);
            $table->text('blockType');
            $table->text('title')->nullable();
            $table->text('date')->nullable();
            $table->text('body')->nullable();
            $table->text('url')->nullable();
            $table->text('meta')->nullable();
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
        });
        Schema::create('Staff', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('role');
            $table->text('name');
            $table->text('initial');
            $table->text('photoUrl')->nullable();
            $table->text('details');
            $table->integer('order')->default(0);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('RisetEntry', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('category');
            $table->string('year');
            $table->text('title');
            $table->text('leader');
            $table->text('member1')->nullable();
            $table->text('member2')->nullable();
            $table->integer('funding')->default(0);
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
            $table->index(['category', 'year']);
        });
        Schema::create('MonevSlot', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('acara')->default('monev');
            $table->string('jurusan');
            $table->string('sesi');
            $table->text('tanggal')->nullable();
            $table->text('mulai');
            $table->text('selesai');
            $table->text('nama');
            $table->text('prodi');
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
            $table->index(['acara', 'jurusan', 'sesi']);
        });
        Schema::create('AcaraPeriode', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('acara')->unique();
            $table->text('judul');
            $table->text('tanggalMulai');
            $table->text('tanggalSelesai')->nullable();
            $table->text('tempat')->nullable();
            $table->text('keterangan')->nullable();
            $table->dateTime('updatedAt', 3);
            $table->boolean('published')->default(true);
        });
        Schema::create('KiKarya', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('tahun');
            $table->text('judul');
            $table->text('ketua');
            $table->string('prodi');
            $table->text('jenisKi');
            $table->text('bentuk')->nullable();
            $table->text('status')->nullable();
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
            $table->index(['prodi', 'tahun']);
        });
        Schema::create('AsesmenLapangan', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('prodi');
            $table->text('tanggal');
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('PblProyek', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('prodi');
            $table->text('proyek');
            $table->text('sumber');
            $table->text('mitra')->nullable();
            $table->text('bidang')->nullable();
            $table->text('waktu')->nullable();
            $table->text('jumlahMahasiswa')->nullable();
            $table->text('mahasiswa')->nullable();
            $table->text('peranNama')->nullable();
            $table->text('jumlahProdi')->nullable();
            $table->text('hasil')->nullable();
            $table->text('belum')->nullable();
            $table->text('sudah')->nullable();
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
            $table->index(['prodi']);
        });
        Schema::create('Kegiatan', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('judul');
            $table->text('tanggalMulai')->nullable();
            $table->text('tanggalSelesai')->nullable();
            $table->text('tempat')->nullable();
            $table->text('narasumber')->nullable();
            $table->text('ringkasan')->nullable();
            $table->text('foto')->nullable();
            $table->integer('order')->default(0);
            $table->dateTime('createdAt', 3);
            $table->dateTime('updatedAt', 3);
            $table->dateTime('deletedAt', 3)->nullable();
            $table->boolean('published')->default(true);
        });
        Schema::create('AdminSession', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('adminId');
            $table->dateTime('expiresAt', 3);
            $table->dateTime('revokedAt', 3)->nullable();
            $table->index(['adminId']);
        });
        Schema::create('RateLimit', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->integer('failures')->default(0);
            $table->bigInteger('expiresAt');
        });
        Schema::create('UploadAsset', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name')->unique();
            $table->integer('size');
            $table->text('sha256');
            $table->text('visibility');
            $table->text('actorId');
            $table->dateTime('createdAt', 3);
        });
        Schema::create('Researcher', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->text('name');
            $table->string('identifier')->nullable()->unique();
        });
        Schema::create('ResearcherAlias', function (Blueprint $table) {
            $table->string('alias')->primary();
            $table->text('researcherId');
        });
        Schema::create('ResearchContribution', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('researcherId');
            $table->string('risetEntryId');
            $table->string('role');
            $table->unique(['researcherId', 'risetEntryId', 'role']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ResearchContribution');
        Schema::dropIfExists('ResearcherAlias');
        Schema::dropIfExists('Researcher');
        Schema::dropIfExists('UploadAsset');
        Schema::dropIfExists('RateLimit');
        Schema::dropIfExists('AdminSession');
        Schema::dropIfExists('Kegiatan');
        Schema::dropIfExists('PblProyek');
        Schema::dropIfExists('AsesmenLapangan');
        Schema::dropIfExists('KiKarya');
        Schema::dropIfExists('AcaraPeriode');
        Schema::dropIfExists('MonevSlot');
        Schema::dropIfExists('RisetEntry');
        Schema::dropIfExists('Staff');
        Schema::dropIfExists('ArchiveBlock');
        Schema::dropIfExists('Winner');
        Schema::dropIfExists('StatEntry');
        Schema::dropIfExists('TrendStat');
        Schema::dropIfExists('RisetGrup');
        Schema::dropIfExists('TautanPengusulan');
        Schema::dropIfExists('Announcement');
        Schema::dropIfExists('ProfileTableContent');
        Schema::dropIfExists('DocumentItem');
        Schema::dropIfExists('Admin');
        Schema::dropIfExists('HubCard');
        Schema::dropIfExists('ActivityLog');
        Schema::dropIfExists('QuickAccessLink');
        Schema::dropIfExists('SiteSettings');
        Schema::dropIfExists('FocusCluster');
        Schema::dropIfExists('RoadmapItem');
        Schema::dropIfExists('ContentListItem');
        Schema::dropIfExists('HeroContent');
    }
};
