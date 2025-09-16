<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class LegacyUser extends Authenticatable
{
    use Notifiable;

    protected $table = 'uzytkownicy';
    protected $primaryKey = 'id';
    public $timestamps = false;

    // pilnuj, żeby hasła nie wychodziły w JSON
    protected $hidden = ['haslo'];

    // pozwól na masowe wypełnianie (albo ustaw $guarded = [])
    protected $fillable = [
        'email', 'imie', 'nazwisko', 'nick', 'rola', 'zdjecie_profilowe', 'haslo',
    ];

    /**
     * Laravel przy logowaniu odpytuje getAuthPassword().
     * Zwracamy kolumnę "haslo", a nie "password".
     */
    public function getAuthPassword()
    {
        return $this->haslo;
    }

    /**
     * Opcjonalnie: jeśli gdzieś w kodzie ktoś ustawi $user->password,
     * to przemapuj to na kolumnę "haslo".
     */
    public function setPasswordAttribute($value)
    {
        $this->attributes['haslo'] = $value;
    }

    public function getPasswordAttribute()
    {
        return $this->attributes['haslo'] ?? null;
    }
}
