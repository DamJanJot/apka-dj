<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Note extends Model
{
    protected $table = 'notatki';
    public $timestamps = false;
    protected $fillable = ['uzytkownik_id','tresc','kolor','pozycja_x','pozycja_y'];

    protected static function booted()
    {
        static::creating(function ($note) {
            $note->uzytkownik_id = auth()->id();
        });
    }
}
