// src/components/applications/ApplicationForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  applicationFormSchema,
  type ApplicationFormOutput,
  type ApplicationFormValues,
} from '@/shared/schemas/application'
import {
  APPLICATION_STATUS_OPTIONS,
  CURRENCIES,
  JOB_TYPE_OPTIONS,
  WORK_MODE_OPTIONS,
} from '@/shared/display'

// The field list shared by the add and edit modals; the callers own the Dialog and
// differ only in title, submit label and mutation. The omitted fields get
// applicationCreateSchema's defaults on create, and on edit the update schema being
// .partial() is what leaves them alone rather than clearing them.
interface ApplicationFormProps {
  defaultValues: ApplicationFormValues
  onSubmit: (values: ApplicationFormOutput) => Promise<void>
  onCancel: () => void
  submitLabel: string
  submittingLabel: string
}

const inputClass =
  'bg-input border-input text-foreground placeholder:text-muted-foreground h-9'
const labelClass = 'text-muted-foreground text-xs'

export default function ApplicationForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel,
  submittingLabel,
}: ApplicationFormProps) {
  // Three generics: values in, context, values out — the input and output types
  // genuinely differ, since the schema coerces dates and numbers on submit.
  const form = useForm<ApplicationFormValues, unknown, ApplicationFormOutput>({
    resolver: standardSchemaResolver(applicationFormSchema),
    defaultValues,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Company *</FormLabel>
                <FormControl>
                  <Input placeholder="Google" className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Role *</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Frontend Developer"
                    className={inputClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="jobUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Job URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://careers.google.com/..."
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Company logo — https only, since DetailHeader renders it into an
            <img src>. Blank clears it. */}
        <FormField
          control={form.control}
          name="companyLogo"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>Company Logo URL</FormLabel>
              <FormControl>
                <Input
                  placeholder="https://logo.clearbit.com/google.com"
                  className={inputClass}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Status</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {APPLICATION_STATUS_OPTIONS.map(({ value, label }) => (
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
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Remote / Kathmandu" className={inputClass} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="workMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Work Mode</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {WORK_MODE_OPTIONS.map(({ value, label }) => (
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
            name="jobType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Job Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={inputClass}>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {JOB_TYPE_OPTIONS.map(({ value, label }) => (
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
        </div>

        <div className="grid grid-cols-[1fr_1fr_auto] gap-3">
          <FormField
            control={form.control}
            name="salaryMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Salary Min</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="50000"
                    className={inputClass}
                    {...field}
                    value={field.value == null ? '' : String(field.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Salary Max</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="80000"
                    className={inputClass}
                    {...field}
                    value={field.value == null ? '' : String(field.value)}
                  />
                </FormControl>
                {/* The min <= max rule reports itself here. */}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="salaryCurrency"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Currency</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className={`${inputClass} w-24`}>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border text-popover-foreground">
                    {CURRENCIES.map(({ code }) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="appliedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Applied Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className={inputClass}
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>Deadline</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    className={inputClass}
                    {...field}
                    value={typeof field.value === 'string' ? field.value : ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="bg-brand hover:bg-brand-hover text-primary-foreground"
          >
            {form.formState.isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  )
}
