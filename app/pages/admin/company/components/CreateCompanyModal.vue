<script setup lang="ts">
const { t } = defineProps<{
  t: TranFunction
}>()

const emit = defineEmits<{
  created: []
  cancel: []
}>()

const open = defineModel('open', { default: false })
// No need for client as we're using $fetch directly

const schema = z.object({
  name: z.string().min(3, t('company.validation.nameMin', { n: 3 })),
  type: z.enum(['customer']),
  externalReference: z.string().optional(),
  isActive: z.boolean().default(true)
})
type Schema = zodOutput<typeof schema>

const state = reactive({
  name: '',
  type: 'customer' as const,
  externalReference: '',
  isActive: true
})

async function onSubmit({ data }: FormSubmitEvent<Schema>) {
  // Using fetch directly since client.admin.createCompany is not defined
  const res = await $fetch<{ company: any }>('/api/admin/company/create', {
    method: 'POST',
    body: {
      name: data.name,
      type: data.type,
      externalReference: data.externalReference,
      isActive: data.isActive
    }
  })

  if (res) {
    open.value = false
    emit('created')
  }
}

const onCancel = () => {
  open.value = false
  emit('cancel')
}
</script>

<template>
  <UModal
    v-model:open="open"
    :close="true"
    :title="t('company.modals.createCompany')"
  >
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField
          :label="t('company.form.name')"
          name="name"
        >
          <UInput
            v-model="state.name"
            class="w-full"
          />
        </UFormField>

        <UFormField
          :label="t('company.form.type')"
          name="type"
        >
          <USelect
            v-model="state.type"
            class="w-full"
            :items="[
              { label: t('company.types.customer'), value: 'customer' }
            ]"
          />
        </UFormField>

        <UFormField
          :label="t('company.form.externalReference')"
          name="externalReference"
        >
          <UInput
            v-model="state.externalReference"
            class="w-full"
          />
        </UFormField>

        <UFormField
          name="isActive"
        >
          <UCheckbox
            v-model="state.isActive"
            :label="t('company.form.isActive')"
          />
        </UFormField>

        <div class="flex justify-end w-full gap-4">
          <UButton
            color="neutral"
            variant="soft"
            @click="onCancel"
          >
            {{ t('global.page.cancel') }}
          </UButton>
          <UButton
            type="submit"
            color="primary"
          >
            {{ t('global.page.create') }}
          </UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>
