<template>
  <Dialog
    v-model:visible="visibility"
    modal
    group="headless"
    class="assign-role-modal"
  >
    <template #header>
      <h1 class="text-xl font-semibold">
        Assign Role
      </h1>
    </template>

    <div class="flex flex-col gap-4">
      <UiCard class="p-0! gap-0! overflow-hidden!">
        <template #header>
          <h2 class="text-lg font-semibold pt-4 px-4">
            Roles
          </h2>
        </template>
        
        <DataTable :value="roles" :loading="loadingRoles">
          <template #empty>
            <span class="w-full text-center flex justify-center">
              Your roles are empty.
            </span>
          </template>
          <Column field="no" header="NO" class="w-18">
            <template #body="slotProps">
              {{ getNoTable(slotProps.index, rolePagination.page, rolePagination.rows) }}
            </template>
          </Column>
          <Column field="name" header="Name">
            <template #body="slotProps">
              {{ slotProps.data.name }}
            </template>
          </Column>
          <Column field="description" header="Description">
            <template #body="slotProps">
              {{ slotProps.data.description }}
            </template>
          </Column>
          <Column field="role_permissions" header="Permissions">
            <template #body="slotProps">
              {{ slotProps.data.role_permissions?.length }}
            </template>
          </Column>
          <Column field="action" header="#" class="w-[152px]">
            <template #body="slotProps">
              <div
                v-if="slotProps.data.name !== 'admin'"
                class="flex gap-2"
              >
                <Button
                  :severity="isRoleSelected(slotProps.data) ? 'default' : 'secondary'"
                  :variant="isRoleSelected(slotProps.data) ? 'soft' : 'outlined'"
                  :label="isRoleSelected(slotProps.data) ? 'Unselect' : 'Select'"
                  :icon="isRoleSelected(slotProps.data) ? 'pi pi-check' : 'pi pi-plus'"
                  size="small"
                  class="w-[120px]"
                  @click="onSelectRole(slotProps.data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>

        <UiPagination
          v-model="rolePagination"
          @page="onRolePageChange"
        />
      </UiCard>
    </div>

    <template #footer>
      <div class="flex justify-end gap-4 pt-4">
        <Button
          severity="secondary"
          label="Cancel"
          size="medium"
          class="w-full md:w-[128px]"
          @click="onCancel"
        />
        <Button
          label="Save"
          size="medium"
          class="w-full md:w-[128px]"
          :disabled="!roleSelected"
          @click="onSave"
        />
      </div>
    </template>
  </Dialog>
</template>
<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue';
import { getNoTable, getErrorMessage } from '@/helpers/utils.ts';
import { showToast } from '@/helpers/toast.ts';
import { getListRole } from '@/modules/role/services/api.ts';
import UiCard from '@/components/UiCard.vue';
import UiPagination from '@/components/UiPagination.vue';

const emits = defineEmits(['submit', 'cancel']);

const visibility = defineModel<boolean>("visibility", {
  required: true
});

// Fetch Roles
interface RoleData {
  id: string;
  name: string;
  description: string;
  role_permissions: Array<{
    role_id: string;
    permission_id: string;
    permissions: {
      id: string;
      code: string;
      description: string;
    }
  }>;
}

const roles = ref<RoleData[]>([]);
const loadingRoles = ref(false);
const rolePagination = ref({
  page: 1,
  pageCount: 0,
  rows: 5,
  totalRecords: 0,
});
const roleSelected = ref<RoleData | null>(null);

const onSelectRole = (role: RoleData) => {
  if (roleSelected.value?.id === role.id) {
    roleSelected.value = null;
  } else {
    roleSelected.value = role;
  }
};

const isRoleSelected = (role: RoleData) => {
  return roleSelected.value?.id === role.id;
};

const fetchRole = async () => {
  try {
    loadingRoles.value = true;
    const payload = {
      page: rolePagination.value.page,
      limit: rolePagination.value.rows,
    }
    const response = await getListRole(payload);
    const { data, meta } = response?.data?.data || {};

    roles.value = data;
    rolePagination.value.totalRecords = meta?.total;
    rolePagination.value.pageCount = meta?.totalPages;
  } catch (error) {
    showToast({
      type: 'error',
      title: 'Error.',
      message: getErrorMessage(error) || 'There was an error.',
    });
  } finally {
    loadingRoles.value = false;
  }
};

const onRolePageChange = (event: any) => {
  rolePagination.value.page = event.page + 1;
  fetchRole();
};

const onCancel = () => {
  emits('cancel');
}

const onSave = () => {
  emits('submit', {
    role: roleSelected.value,
  });
}

watch(() => visibility.value, (val: any) => {
  if (val) {
    roleSelected.value = null;
  }
});

onMounted(() => {
  fetchRole();
});
</script>
<style>
.assign-role-modal {
  width: 50rem;
}

.assign-role-modal .p-dialog-content {
  padding-bottom: 0 !important;
}
</style>
