// src/app/(dashboard)/profile/page.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useProfile } from '@/hooks/useQueries'
import { useUpdateProfile } from '@/hooks/useMutations'
import { profileFormSchema, type ProfileFormValues } from '@/lib/schemas/user'
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  JOB_SEARCH_STATUS_OPTIONS,
} from '@/lib/display'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  User,
  MapPin,
  Phone,
  Link,
  Globe,
  Briefcase,
  Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import AvatarUpload from '@/components/profile/AvatarUpload'

const EMPTY_PROFILE: ProfileFormValues = {
  name: '',
  bio: '',
  location: '',
  phone: '',
  linkedIn: '',
  portfolio: '',
  currency: DEFAULT_CURRENCY,
  jobSearchStatus: 'actively_looking',
}

export default function ProfilePage() {
  // photo is managed by AvatarUpload outside the form and merged in at submit
  // time — exactly the split profileFormSchema documents.
  const [photo, setPhoto] = useState('')

  const { data: profile, isLoading } = useProfile()
  const updateProfile = useUpdateProfile()

  const form = useForm<ProfileFormValues>({
    resolver: standardSchemaResolver(profileFormSchema),
    defaultValues: EMPTY_PROFILE,
  })

  // Hydrate from the server once loaded. reset() during render is RHF's
  // supported way to do this; the previous useEffect+setState version is what
  // the set-state-in-effect lint error pointed at.
  const loadedId = profile?._id ?? null
  const [hydratedId, setHydratedId] = useState<string | null>(null)
  if (profile && loadedId !== hydratedId) {
    setHydratedId(loadedId)
    form.reset({
      name: profile.name ?? '',
      bio: profile.bio ?? '',
      location: profile.location ?? '',
      phone: profile.phone ?? '',
      linkedIn: profile.linkedIn ?? '',
      portfolio: profile.portfolio ?? '',
      currency: profile.currency ?? DEFAULT_CURRENCY,
      jobSearchStatus: profile.jobSearchStatus ?? 'actively_looking',
    })
    setPhoto(profile.photo ?? '')
  }

  async function handleSave(values: ProfileFormValues) {
    // Failures now surface as a toast from the mutation. Previously res.ok was
    // never checked, so a 400 still rendered "Saved!".
    await updateProfile.mutateAsync({ ...values, photo })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-foreground text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your personal information and preferences
        </p>
      </div>

      {/* Avatar */}
      <div className="bg-card border border-border rounded-xl p-6 flex justify-center">
        <AvatarUpload
          currentPhoto={photo}
          name={form.watch('name')}
          onUpload={(url) => setPhoto(url)}
        />
      </div>

      {/* Profile form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">

        {/* Personal info */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <User className="w-4 h-4" />
            Personal Information
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-muted-foreground text-xs">Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Your full name"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel className="text-muted-foreground text-xs">Bio</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description about yourself..."
                      className="bg-background border-border text-foreground min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-muted-foreground text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Kathmandu, Nepal"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-muted-foreground text-xs flex items-center gap-1"><Phone className="w-3 h-3" /> Phone</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+977 98XXXXXXXX"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="linkedIn"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-muted-foreground text-xs flex items-center gap-1"><Link className="w-3 h-3" /> LinkedIn</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://linkedin.com/in/..."
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="portfolio"
              render={({ field }) => (
                <FormItem className="">
                  <FormLabel className="text-muted-foreground text-xs flex items-center gap-1"><Globe className="w-3 h-3" /> Portfolio</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://yourportfolio.com"
                      className="bg-background border-border text-foreground"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4">
          <h2 className="text-foreground font-semibold text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Job Search Preferences
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="jobSearchStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Job Search Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border">
                      {JOB_SEARCH_STATUS_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-muted-foreground text-xs">Preferred Currency</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-popover border-border">
                      {CURRENCIES.map(({ code, name }) => (
                        <SelectItem key={code} value={code}>{code} — {name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Save button */}
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
        >
          <Save className="w-4 h-4" />
          {form.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
        </Button>

        </form>
      </Form>
    </div>
  )
}