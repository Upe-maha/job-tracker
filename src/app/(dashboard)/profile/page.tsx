// src/app/(dashboard)/profile/page.tsx
'use client'

import { useState, type ComponentType } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { toast } from 'sonner'
import { format } from 'date-fns'
import {
  Briefcase,
  Coins,
  FileText,
  Globe,
  Link as LinkIcon,
  Mail,
  MapPin,
  Phone,
  Plug,
  Save,
  User,
} from 'lucide-react'
import { useProfile } from '@/hooks/useQueries'
import { useUpdateProfile } from '@/hooks/useMutations'
import { profileFormSchema, type ProfileFormValues } from '@/lib/schemas/user'
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  JOB_SEARCH_STATUS_LABELS,
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
import PageShell, { PageGrid } from '@/components/common/PageShell'
import Panel, { Fact } from '@/components/common/Panel'
import ErrorState from '@/components/common/ErrorState'
import { FormSkeleton } from '@/components/common/Skeletons'
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
import ResumeCard from '@/components/profile/ResumeCard'
import PdfPreview from '@/components/common/PdfPreview'
import ConnectedAccounts from '@/components/profile/ConnectedAccounts'
import { GitHubMark } from '@/components/common/ProviderMarks'
import { linkErrorMessage } from '@/lib/security/loginErrors'
import { OAUTH_PROVIDER_LABELS } from '@/lib/display'
import type { OAuthProvider } from '@/types'

const EMPTY_PROFILE: ProfileFormValues = {
  name: '',
  bio: '',
  location: '',
  phone: '',
  linkedIn: '',
  portfolio: '',
  github: '',
  currency: DEFAULT_CURRENCY,
  jobSearchStatus: 'actively_looking',
}

const inputClass = 'bg-background border-border text-foreground'
const labelClass = 'text-muted-foreground text-xs'

// The identity card mirrors the summary panel in the reference: portrait,
// name, the one-line status beneath it, then a fact grid. Values track the
// form live, so editing a field updates the summary as you type.
const STATUS_BADGE: Record<string, string> = {
  actively_looking: 'bg-stage-offer text-stage-offer-fg border-stage-offer-fg/20',
  open: 'bg-stage-interview text-stage-interview-fg border-stage-interview-fg/20',
  not_looking: 'bg-muted text-muted-foreground border-border',
}

// A Fact whose value is a link when there is one to follow. Same shape and
// spacing as Fact so the Contact panel's rows stay aligned whether or not a
// field is filled in.
function ProfileLink({
  label,
  href,
  icon: Icon,
}: {
  label: string
  href?: string
  // Same loose shape Fact and Panel use, so a lucide icon and the inline
  // GitHub mark are both acceptable here.
  icon: ComponentType<{ className?: string }>
}) {
  if (!href?.trim()) return <Fact label={label} value="" icon={Icon} />

  return (
    <div className="min-w-0">
      <p className="text-muted-foreground text-xs flex items-center gap-1.5">
        <Icon className="w-3 h-3 shrink-0" />
        {label}
      </p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        title={href}
        className="text-primary text-sm mt-1 block truncate hover:underline py-1.5 lg:py-0"
      >
        {href}
      </a>
    </div>
  )
}

export default function ProfilePage() {
  // photo is managed by AvatarUpload outside the form and merged in at submit
  // time — exactly the split profileFormSchema documents.
  const [photo, setPhoto] = useState('')
  const searchParams = useSearchParams()

  const { data: profile, isLoading, isError, error, refetch, isFetching } = useProfile()
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
      github: profile.github ?? '',
      currency: profile.currency ?? DEFAULT_CURRENCY,
      jobSearchStatus: profile.jobSearchStatus ?? 'actively_looking',
    })
    setPhoto(profile.photo ?? '')
  }

  // Step E. Connecting a provider leaves the app entirely, so its outcome comes
  // back as a query param rather than a mutation result — a failure is a string
  // returned from the signIn callback, which @auth/core treats as a redirect.
  // Reported once per param, using the same render-time guard the hydration
  // above uses rather than an effect.
  const linked = searchParams.get('linked')
  const linkError = searchParams.get('error')
  const linkOutcome = linkError ?? linked
  const [reportedOutcome, setReportedOutcome] = useState<string | null>(null)
  if (linkOutcome && linkOutcome !== reportedOutcome) {
    setReportedOutcome(linkOutcome)
    if (linkError) {
      toast.error(linkErrorMessage(linkError))
    } else if (linked) {
      const label = OAUTH_PROVIDER_LABELS[linked as OAuthProvider] ?? linked
      toast.success(`${label} connected`)
    }
  }

  async function handleSave(values: ProfileFormValues) {
    // Failures now surface as a toast from the mutation. Previously res.ok was
    // never checked, so a 400 still rendered "Saved!".
    await updateProfile.mutateAsync({ ...values, photo })
  }

  if (isLoading) {
    return (
      <PageShell>
        <FormSkeleton />
      </PageShell>
    )
  }

  if (isError) {
    return (
      <PageShell>
        <ErrorState error={error} onRetry={() => refetch()} isRetrying={isFetching} />
      </PageShell>
    )
  }

  const live = form.watch()
  const memberSince = profile?.createdAt
    ? format(new Date(profile.createdAt), 'MMM yyyy')
    : ''

  return (
    <PageShell>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSave)}>
          <PageGrid>

            {/* ── Identity ───────────────────────────────────────────── */}
            {/* Sticky so the summary stays in view while the longer edit
                column scrolls past it. */}
            <aside className="md:col-span-4">
              <div className="md:sticky md:top-6 space-y-6">
                <Panel bodyClassName="p-6">
                  <div className="flex flex-col items-center text-center">
                    <AvatarUpload
                      currentPhoto={photo}
                      name={live.name}
                      onUpload={url => setPhoto(url)}
                    />

                    <h2 className="text-foreground font-bold text-lg mt-4 truncate max-w-full">
                      {live.name || 'Your name'}
                    </h2>
                    <p className="text-muted-foreground text-sm truncate max-w-full">
                      {profile?.email}
                    </p>

                    <span
                      className={`mt-3 text-xs px-2.5 py-1 rounded-full border ${
                        STATUS_BADGE[live.jobSearchStatus] ?? STATUS_BADGE.not_looking
                      }`}
                    >
                      {JOB_SEARCH_STATUS_LABELS[live.jobSearchStatus]}
                    </span>

                    {live.bio?.trim() && (
                      <p className="text-muted-foreground text-sm mt-4 leading-relaxed">
                        {live.bio}
                      </p>
                    )}

                    {/* The CV is reachable from the summary card too, not only
                        from its panel further down the edit column — this is
                        the part of the page that answers "who am I on paper",
                        and the CV is the rest of that answer. Absent when
                        there is nothing to show, rather than a dead button. */}
                    {profile?.resume && (
                      <PdfPreview url={profile.resume}>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-4 gap-2 border-border"
                        >
                          <FileText className="w-3 h-3" /> View CV
                        </Button>
                      </PdfPreview>
                    )}
                  </div>

                  {/* Fact grid — the reference's DOB/Age/Weight/Height block,
                      carrying this app's equivalents. */}
                  <div className="grid grid-cols-2 gap-4 mt-6 pt-5 border-t border-border">
                    <Fact label="Location" value={live.location} icon={MapPin} />
                    <Fact label="Phone" value={live.phone} icon={Phone} />
                    <Fact label="Currency" value={live.currency} icon={Coins} />
                    <Fact label="Member since" value={memberSince} icon={Briefcase} />
                  </div>
                </Panel>

                <Panel title="Contact" icon={Mail}>
                  <div className="space-y-4">
                    <Fact label="Email" value={profile?.email} icon={Mail} />
                    {/* The three link fields are anchors now, which is why the
                        schema validates them with safeUrl rather than text:
                        an unchecked string in an href is how javascript: gets
                        in. They fall back to a plain Fact when empty. */}
                    <ProfileLink label="LinkedIn" href={live.linkedIn} icon={LinkIcon} />
                    <ProfileLink label="Portfolio" href={live.portfolio} icon={Globe} />
                    <ProfileLink label="GitHub" href={live.github} icon={GitHubMark} />
                  </div>
                </Panel>
              </div>
            </aside>

            {/* ── Edit ───────────────────────────────────────────────── */}
            <div className="md:col-span-8 space-y-6">

              <Panel title="Personal Information" icon={User}>
                <PageGrid className="gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-12">
                        <FormLabel className={labelClass}>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Your full name" className={inputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem className="md:col-span-12">
                        <FormLabel className={labelClass}>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Brief description about yourself..."
                            className={`${inputClass} min-h-[80px] resize-none`}
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
                      <FormItem className="md:col-span-6">
                        <FormLabel className={`${labelClass} flex items-center gap-1`}>
                          <MapPin className="w-3 h-3" /> Location
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="Kathmandu, Nepal" className={inputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel className={`${labelClass} flex items-center gap-1`}>
                          <Phone className="w-3 h-3" /> Phone
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="+977 98XXXXXXXX" className={inputClass} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </PageGrid>
              </Panel>

              <Panel title="Links" icon={LinkIcon}>
                <PageGrid className="gap-4">
                  <FormField
                    control={form.control}
                    name="linkedIn"
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel className={`${labelClass} flex items-center gap-1`}>
                          <LinkIcon className="w-3 h-3" /> LinkedIn
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://linkedin.com/in/..."
                            className={inputClass}
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
                      <FormItem className="md:col-span-6">
                        <FormLabel className={`${labelClass} flex items-center gap-1`}>
                          <Globe className="w-3 h-3" /> Portfolio
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://yourportfolio.com"
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* The profile URL, which has nothing to do with the GitHub
                      account linked below — one is a link, the other is a way
                      to sign in. */}
                  <FormField
                    control={form.control}
                    name="github"
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel className={`${labelClass} flex items-center gap-1`}>
                          <GitHubMark className="w-3 h-3" /> GitHub
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://github.com/username"
                            className={inputClass}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </PageGrid>
              </Panel>

              {/* Both panels live outside the form's control: each persists on
                  its own the moment it is used, so neither depends on Save. */}
              <Panel title="CV / Resume" icon={FileText}>
                <ResumeCard resume={profile?.resume ?? ''} />
              </Panel>

              <Panel title="Connected Accounts" icon={Plug}>
                <ConnectedAccounts accounts={profile?.accounts ?? []} />
              </Panel>

              <Panel title="Job Search Preferences" icon={Briefcase}>
                <PageGrid className="gap-4">
                  <FormField
                    control={form.control}
                    name="jobSearchStatus"
                    render={({ field }) => (
                      <FormItem className="md:col-span-6">
                        <FormLabel className={labelClass}>Job Search Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={inputClass}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border">
                            {JOB_SEARCH_STATUS_OPTIONS.map(({ value, label }) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
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
                      <FormItem className="md:col-span-6">
                        <FormLabel className={labelClass}>Preferred Currency</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className={inputClass}>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-popover border-border">
                            {CURRENCIES.map(({ code, name }) => (
                              <SelectItem key={code} value={code}>
                                {code} — {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </PageGrid>
              </Panel>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
                >
                  <Save className="w-4 h-4" />
                  {form.formState.isSubmitting ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </div>
          </PageGrid>
        </form>
      </Form>
    </PageShell>
  )
}
