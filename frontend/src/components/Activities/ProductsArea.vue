<template>
  <div class="flex flex-col px-3 pb-3 sm:px-10 sm:pb-5">
    <div class="my-3 flex items-center justify-between sm:mb-4 sm:mt-4">
      <div class="flex h-8 items-center text-lg font-semibold text-ink-gray-8">
        {{ __('Products') }}
        <Badge
          v-if="document.isDirty"
          class="ml-3"
          :label="__('Not Saved')"
          theme="orange"
        />
      </div>
      <Button
        :label="__('Save')"
        :disabled="!document.isDirty"
        variant="solid"
        :loading="document.save.loading"
        @click="saveChanges"
      />
    </div>
    <div
      v-if="document.get.loading"
      class="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-base text-ink-gray-6"
    >
      <LoadingIndicator class="h-6 w-6" />
      <span>{{ __('Loading...') }}</span>
    </div>
    <Grid
      v-else
      v-model="document.doc.products"
      v-model:parent="document.doc"
      doctype="CRM Products"
      :parentDoctype="doctype"
      parentFieldname="products"
      :disableLinkCreate="true"
    />
  </div>
</template>

<script setup>
import Grid from '@/components/Controls/Grid.vue'
import LoadingIndicator from '@/components/Icons/LoadingIndicator.vue'
import { Badge } from 'frappe-ui'
import { useDocument } from '@/data/document'
import { provide, watch } from 'vue'

const props = defineProps({
  doctype: { type: String, required: true },
  docname: { type: String, required: true },
})

// useDocument hands back the same cached document resource the rest of the
// detail page uses, plus the form-script triggers Grid injects. Providing
// them here lets the native "Product Details" CRM Form Script run on row
// add / product_code / qty / rate change — auto-filling the line rate from
// CRM Product.standard_rate and computing amount = qty * rate.
const {
  document,
  triggerOnChange,
  triggerButton,
  triggerOnRowAdd,
  triggerOnRowRemove,
} = useDocument(props.doctype, props.docname)

provide('triggerOnChange', triggerOnChange)
provide('triggerButton', triggerButton)
provide('triggerOnRowAdd', triggerOnRowAdd)
provide('triggerOnRowRemove', triggerOnRowRemove)

// Empty child tables can come back undefined; Grid mutates the array in
// place (push/splice) so it must be a real array on the doc before binding.
watch(
  () => document.doc,
  (doc) => {
    if (doc && !Array.isArray(doc.products)) doc.products = []
  },
  { immediate: true },
)

function saveChanges() {
  if (!document.isDirty) return
  document.save.submit()
}

// Mirror DataFields.vue dirty tracking so the Save button enables on edit.
watch(
  () => document.doc,
  (newValue, oldValue) => {
    if (!oldValue) return
    if (newValue && oldValue) {
      const isDirty =
        JSON.stringify(newValue) !== JSON.stringify(document.originalDoc)
      document.isDirty = isDirty
      if (isDirty) document.save.loading = false
    }
  },
  { deep: true },
)
</script>
