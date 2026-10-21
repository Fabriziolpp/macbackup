import { NextResponse } from 'next/server';
import { requireAuth, authError } from '@/lib/auth';

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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAuth(request);
    const body = await request.json();
    const update: Record<string, any> = {
      data: body.data,
      ora: body.ora || '',
      scheda: body.scheda || '',
      tipo: body.tipo || '',
      durata: parseInt(body.durata, 10) || 0,
      note: body.note || '',
    };
    if (body.setsCompleted !== undefined) update.sets_completed = body.setsCompleted;
    if (body.setsTotal !== undefined) update.sets_total = body.setsTotal;
    if (body.exercisesCompleted !== undefined) update.exercises_completed = body.exercisesCompleted;
    if (body.exercisesTotal !== undefined) update.exercises_total = body.exercisesTotal;
    if (body.programmaWeek !== undefined) update.programma_week = body.programmaWeek;
    if (body.voiceNoteTranscript !== undefined) update.voice_note_transcript = body.voiceNoteTranscript;
    if (body.source !== undefined) update.source = body.source === 'live' ? 'live' : 'manual';
    if (body.exerciseResults !== undefined) update.exercise_results = body.exerciseResults;

    const { data, error } = await supabase
      .from('workouts').update(update).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
    return NextResponse.json(shapeWorkout(data));
  } catch (e) { return authError(e); }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase } = await requireAuth(request);
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) { return authError(e); }
}
