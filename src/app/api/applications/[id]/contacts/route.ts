import {NextResponse} from "next/server"
import {auth} from "@/lib/auth"
import {connectDB} from "@/lib/db"
import Application from "@/models/Application"

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
            name,
            role,
            email,
            phone,
            linkedin,
        } = body

        if(!name){
            return NextResponse.json({error: "Name is required"}, {status: 400})
        }

        await connectDB()

        const application = await Application.findOneAndUpdate({
            _id: id,
            user: session.user.id
        }, {
            $push: {
                contacts: {
                    name,
                    role,
                    email,
                    phone,
                    linkedin
                }
            }
        }, { new: true })

        if(!application){
            return NextResponse.json({error: "Application not found"}, {status: 404})
        }

        const newContact = application.contacts[application.contacts.length - 1]
        return NextResponse.json({message: "Contact added successfully", contact: newContact}, {status: 201})

    }catch (error) {
        console.error("Adding contact Error:", error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}

export async function DELETE(
    req: Request,
    {params}: {params: Promise<{ id: string }> }
){
    try {
        const session = await auth()
        if(!session){
            return NextResponse.json({error: "Unauthorized"}, {status: 401})
        }

        const {id} = await params

        const {contactId} = await req.json()

        if(!contactId){
            return NextResponse.json({error: "Contact ID is required"}, {status: 400})
        }

        await connectDB()

        const application = await Application.findOneAndUpdate(
            {
                _id: id,
                user: session.user.id
            },
            {
                $pull: {
                    contacts: {
                        _id: contactId
                    }
                }
            },
            { new: true }
        )
        
        if(!application){
            return NextResponse.json({error: "Application not found"}, {status: 404})
        }

        return NextResponse.json({message: "Contact deleted successfully"}, {status: 200})
    } catch (error) {
        console.error("Deleting contact Error:", error)
        return NextResponse.json({error: "Internal Server Error"}, {status: 500})
    }
}