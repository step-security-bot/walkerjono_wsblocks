<i18n src="./i18n.json"></i18n>

<script setup lang="ts">
import CreateCompanyModal from './components/CreateCompanyModal.vue'
import DeactivateCompanyModal from './components/DeactivateCompanyModal.vue'

const { t } = useI18n()
// No need for client as we're using $fetch directly
const isCompanyModalOpen = ref(false)
const isDeactivateModalOpen = ref(false)
const selectedCompanyId = ref('')

// Define company type for TypeScript
interface Company {
  id: string
  name: string
  type: 'customer'
  isActive: boolean
  externalReference?: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

const filters: AdminTableFilter[] = reactive([
  {
    name: t('global.page.name'),
    field: 'name',
    type: 'input',
    value: undefined
  },
  {
    name: t('company.columns.type'),
    field: 'type',
    type: 'checkbox',
    items: [
      { label: t('company.types.customer'), id: 'customer', count: 0 }
    ],
    value: []
  },
  {
    name: t('company.columns.isActive'),
    field: 'isActive',
    type: 'tabs',
    items: [
      { label: t('global.page.all'), id: 'all', count: 0 },
      { label: t('company.filters.active'), id: 'active', count: 0 },
      { label: t('company.filters.inactive'), id: 'inactive', count: 0 }
    ],
    value: 'all'
  },
  {
    name: t('global.page.createdAt'),
    field: 'createdAt',
    type: 'daterange',
    value: { start: undefined, end: undefined }
  }
])

const { refresh } = useAdminTable()

const getActionItems = (row: Row<Company>) => {
  const company = row.original
  return [
    {
      type: 'label',
      label: t('global.page.actions')
    },
    {
      type: 'separator'
    },
    {
      label: company.isActive ? t('company.actions.deactivate') : t('company.actions.activate'),
      icon: company.isActive ? 'i-lucide-ban' : 'i-lucide-check',
      color: company.isActive ? 'error' : 'success',
      async onSelect() {
        if (!company.isActive) {
          // Activate company
          const result = await $fetch<{ company: Company }>('/api/admin/company/activate', {
            method: 'POST',
            body: {
              companyId: company.id
            }
          })
          if (result?.company) {
            refresh()
          }
        } else {
          // Deactivate company
          selectedCompanyId.value = company.id
          isDeactivateModalOpen.value = true
        }
      }
    },
    {
      label: t('global.page.delete'),
      icon: 'i-lucide-trash',
      color: 'error',
      async onSelect() {
        const removeResult = await $fetch<{ success: boolean }>('/api/admin/company/remove', {
          method: 'POST',
          body: {
            companyId: company.id
          }
        })
        if (removeResult?.success) {
          refresh()
        } else {
          console.error('Failed to remove company')
        }
      }
    }
  ]
}

const columns: AdminTableColumn<Company>[] = [
  {
    accessorKey: 'id',
    header: 'ID'
  },
  {
    accessorKey: 'name',
    header: t('global.page.name')
  },
  {
    accessorKey: 'type',
    header: t('company.columns.type'),
    cell: ({ row }) => t(`company.types.${row.original.type}`)
  },
  {
    accessorKey: 'externalReference',
    header: t('company.columns.externalReference')
  },
  {
    accessorKey: 'isActive',
    header: t('company.columns.isActive')
  },
  {
    accessorKey: 'createdAt',
    header: t('global.page.createdAt'),
    cell: dateColumn
  },
  {
    id: 'actions',
    cell: ({ row }) => actionColumn(row, getActionItems)
  }
]

const fetchStatusCount = async (filter: FilterCondition[]) => {
  // Note: We'll need to implement this API endpoint
  const statusCount = await $fetch<ColumnCount[]>('/api/admin/count/company/isActive', {
    query: {
      filter: JSON.stringify(filter)
    }
  })

  const statusFilter = filters[2] as FilterTabs
  let totalCount = 0

  statusFilter.items.forEach((item) => {
    if (item.id === 'all') {
      // Will be set after counting others
    } else if (item.id === 'active') {
      const status = statusCount.find(status => status.column === 'true')
      item.count = status ? status.count : 0
      totalCount += item.count
    } else if (item.id === 'inactive') {
      const status = statusCount.find(status => status.column === 'false')
      item.count = status ? status.count : 0
      totalCount += item.count
    }
  })

  // Set the 'all' count
  const allItem = statusFilter.items.find(item => item.id === 'all')
  if (allItem) {
    allItem.count = totalCount
  }
}

const fetchTypeCount = async (filter: FilterCondition[]) => {
  // Note: We'll need to implement this API endpoint
  const typeCount = await $fetch<ColumnCount[]>('/api/admin/count/company/type', {
    query: {
      filter: JSON.stringify(filter)
    }
  })

  const typeFilter = filters[1] as FilterCheckbox
  typeFilter.items.forEach((item) => {
    const type = typeCount.find(type => type.column === item.id)
    item.count = type ? type.count : 0
  })
}

const fetchData: FetchDataFn<Company> = async ({ page, limit, sort, filter }) => {
  // Process the isActive filter
  const statusFilter = filters[2] as FilterTabs
  if (statusFilter.value !== 'all') {
    const isActive = statusFilter.value === 'active'
    filter.push({
      col: 'isActive',
      op: 'eq',
      v: isActive.toString()
    })
  }

  // Fetch counts for filters
  fetchStatusCount(filter)
  fetchTypeCount(filter)

  // Note: We'll need to implement this API endpoint
  const result = await $fetch<PageData<Company>>('/api/admin/list/company', {
    query: {
      page,
      limit,
      sort: JSON.stringify(sort.map((item) => {
        return [item.field, item.order]
      })),
      filter: JSON.stringify(filter)
    }
  })

  return {
    data: result.data,
    total: result.total
  }
}
</script>

<template>
  <NuxtLayout name="admin">
    <template #navRight>
      <UButton
        color="neutral"
        icon="i-lucide-plus"
        variant="outline"
        @click="isCompanyModalOpen = true"
      >
        {{ t('company.actions.createCompany') }}
      </UButton>
    </template>
    <AdminTable
      ref="table"
      :columns="columns"
      :filters="filters"
      :fetch-data="fetchData"
    >
      <template #isActive-cell="{ row: { original } }">
        <UBadge
          :color="original.isActive ? 'success' : 'error'"
          :label="original.isActive ? t('company.status.active') : t('company.status.inactive')"
        />
      </template>
    </AdminTable>
    <CreateCompanyModal
      v-model:open="isCompanyModalOpen"
      :t="t"
      @created="refresh"
    />
    <DeactivateCompanyModal
      v-model:open="isDeactivateModalOpen"
      :company-id="selectedCompanyId"
      :t="t"
      @deactivated="refresh"
    />
  </NuxtLayout>
</template>
