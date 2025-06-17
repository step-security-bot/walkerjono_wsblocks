<script setup lang="ts">
const props = defineProps<{
  t: TranFunction
  companyId: string
}>()

const emit = defineEmits<{
  deactivated: []
  cancel: []
}>()

const { t } = props

const open = defineModel('open', { default: false })
// No need for client as we're using $fetch directly

const reason = ref('')

async function onSubmit() {
  // Using fetch directly since client.admin.deactivateCompany is not defined
  const res = await $fetch<{ company: any }>('/api/admin/company/deactivate', {
    method: 'POST',
    body: {
      companyId: props.companyId,
      reason: reason.value
    }
  })

  if (res) {
    open.value = false
    emit('deactivated')
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
    :title="t('company.modals.deactivate.title')"
  >
    <template #body>
      <div class="space-y-4">
        <UFormField
          :label="t('company.modals.deactivate.reason')"
          name="reason"
        >
          <UTextarea
            v-model="reason"
            :placeholder="t('company.modals.deactivate.reasonPlaceholder')"
            class="w-full"
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
            @click="onSubmit"
          >
            {{ t('company.modals.deactivate.submit') }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
