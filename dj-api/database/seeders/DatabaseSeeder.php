<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            NeuroNetixRoleSeeder::class,
            NeuroNetixAssignmentSeeder::class,
            NewsSeeder::class,
            RateSeeder::class,
            CryptoSeeder::class,
            GoldPriceSeeder::class,
        ]);
    }
}
