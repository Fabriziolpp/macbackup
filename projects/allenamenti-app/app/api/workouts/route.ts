import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';
import { newId } from '@/lib/utils';

function shapeWorkout(w: any) {
  return {
    id: w.id,
    data: w.data,
    ora: w.ora ?? '',
    scheda: w.scheda ?? '',
    tipo: w.tipo ?? '',
    durata: w.durata ?? 0,
    note: w.note ?? '',
    setsCompleted: w.sets_completed ?? undefined,
    setsTotal: w.sets_total ?? undefined,
    exercisesCompleted: w.exercises_completed ?? undefined,
    exercisesTotal: w.exercises_total ?? undefined,
    programmaWeek: w.programma_week ?? undefined,
    voiceNoteTranscript: w.voice_note_transcript ?? undefined,
    source: (w.source as 'manual' | 'live' | null) ?? 'manual',
    exerciseResults: w.exercise_results ?? undefined,
  };
}

export async function GET(request: Request) {
  try {
    const { supabase } = await requireAuth(request);
    const { data, error } = await supabase.from('workouts').select('*').order('data');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json((data ?? []).map(shapeWorkout));
  } catch (e) { return authError(e); }
}

export async function POST(request: Request) {
  try {
    const { user, supabase } = await requireAuth(request);
    const body = await request.json();
    const row: Record<string, any> = {
      id: newId(),
      data: body.data,
      ora: body.ora || '',
      scheda: body.scheda || '',
      tipo: body.tipo || '',
      durata: parseInt(body.durata, 10) || 0,
      note: body.note || '',
      user_id: user.id,
    };
    if (body.setsCompleted !== undefined) row.sets_completed = body.setsCompleted;
    if (body.setsTotal !== undefined) row.sets_total = body.setsTotal;
    if (body.exercisesCompleted !== undefined) row.exercises_completed = body.exercisesCompleted;
    if (body.exercisesTotal !== undefined) row.exercises_total = body.exercisesTotal;
    if (body.programmaWeek !== undefined) row.programma_week = body.programmaWeek;
    if (body.voiceNoteTranscript !== undefined) row.voice_note_transcript = body.voiceNoteTranscript;
    if (body.source !== undefined) row.source = body.source === 'live' ? 'live' : 'manual';
    if (body.exerciseResults !== undefined) row.exercise_results = body.exerciseResults;
    const { error } = await supabase.from('workouts').insert(row);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(shapeWorkout(row), { status: 201 });
  } catch (e) { return authError(e); }
}
