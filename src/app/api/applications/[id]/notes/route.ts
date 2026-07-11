
import {NextResponse} from "next/server";
import {auth} from "@/lib/auth";
import {connectDB} from "@/lib/db";
import Application from "@/models/Application";

// Get- fetch all the appplication[id] notes 
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try{
        const session = await auth()
        if(!session){
            return NextResponse.json({error: "Unauthorized"}, {status: 401})
        }

        const { id } = await params
        await connectDB()

        const application = await Application.findOne(
            {
                _id: id,
                user: session.user.id
            })

        if(!application){
            return NextResponse.json({error: "Application not found"}, {status: 404})
        }

        return NextResponse.json(application.notes, {status: 200})
    }
    catch (error){
        console.error("Error fetching application notes:", error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}


// POST- add a new note to the application[id]
export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
){
    try {
        const session = await auth()
        if(!session){
            return NextResponse.json({error: "Unauthorized"}, {status: 401})
        }

        const {id} = await params
        
        const body = await req.json()

        const {
            type,
            content,
            interviewRound,
            outcome,
            whatWentWrong,
            WhatToImprove,
        } = body

        if(!content){
            return NextResponse.json({error: "Content is required"}, {status: 400})
        }

        await connectDB()

        const application = await Application.findOneAndUpdate(
            {
                _id: id,
                user: session.user.id
            },
            {
                $push: {
                    notes: {
                        type: type ?? 'general',
                        content,
                        interviewRound: interviewRound ?? null,
                        outcome: outcome ?? null,
                        whatWentWrong: whatWentWrong ?? '',
                        WhatToImprove: WhatToImprove ?? '',
                    }
                }
            },
            { new: true }
        )

        if(!application){
            return NextResponse.json({error: "Application not found"}, {status: 404})
        }

        const newNote = application.notes[application.notes.length - 1]

        return NextResponse.json(newNote, {status: 201})
    } 
    catch( error ){
        console.error("Error adding note to application:", error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}


// DELETE- delete a note from the application[id]
export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
){
    try {
        const session = await auth()
        if(!session){
            return NextResponse.json({error: "Unauthorized"}, {status: 401})
        }

        const {id} = await params
        
        const { noteId } = await req.json()
        
        if(!noteId){
            return NextResponse.json({error: "Note ID is required"}, {status: 400})
        }  

        await connectDB()

        const application = await Application.findOneAndUpdate(
            {
                _id: id,
                user: session.user.id
            },
            {
                $pull: {
                    notes: {
                        _id: noteId
                    }
                }
            },
            { new: true }
        )

        if(!application){
            return NextResponse.json({error: "Application not found"}, {status: 404})
        }

        return NextResponse.json({message: "Note deleted successfully"}, {status: 200})
  } catch (error) {
        console.error("Deleting note Error:", error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
  }
}