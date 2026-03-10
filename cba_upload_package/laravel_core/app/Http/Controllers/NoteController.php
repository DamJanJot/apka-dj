<?php
namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;

class NoteController extends Controller
{
    public function index()
    {
        return Note::where('uzytkownik_id', auth()->id())->get();
    }

    public function store(Request $r)
    {
        $data = $r->validate([
            'tresc' => 'required|string',
            'kolor' => 'nullable|string|max:20',
            'pozycja_x' => 'nullable|integer',
            'pozycja_y' => 'nullable|integer',
        ]);
        return Note::create($data);
    }

    public function update(Note $note, Request $r)
    {
        abort_unless($note->uzytkownik_id === auth()->id(), 403);
        $note->update($r->only('tresc','kolor','pozycja_x','pozycja_y'));
        return $note;
    }

    public function destroy(Note $note)
    {
        abort_unless($note->uzytkownik_id === auth()->id(), 403);
        $note->delete();
        return response()->noContent();
    }
}
