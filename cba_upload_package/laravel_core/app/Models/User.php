<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'uzytkownicy'; // 👈 wskazujemy prawidłową tabelę

    protected $fillable = [
        'imie',
        'nazwisko',
        'email',
        'haslo',
        'zdjecie_profilowe',
        'nick',
        'opis',
        'rola',
    ];

    protected $hidden = [
        'haslo',
        'remember_token',
    ];

    /**
     * Laravel standardowo szuka kolumny "password",
     * ale u Ciebie jest "haslo" → trzeba nadpisać getter
     */
    public function getAuthPassword()
    {
        return $this->haslo;
    }
}
