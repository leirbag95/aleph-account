<template>
  <q-page class="q-pa-md">
    <!-- start: create vm dialog -->
    <q-dialog v-model="showCreateProgram">
      <CreateNewVM :account="account" :api_server="api_server" @created="uploadVM" />
    </q-dialog>
    <!-- end: create vm dialog -->
    <div v-if="account" class="q-mb-md">
      <div v-if="balance_info.ALEPH < 1" class="doc-note doc-note--warning">
        <p>
          <q-icon name="warning" size="md" />
          You need ALEPH tokens to use this dApp section.
        </p>
      </div>
    </div>
    <div v-else class="login-info">
      Please connect.
    </div>
    <div class="q-mb-md" v-if="account">
      <div class="row justify-between">
        <div class="row justify-start">
          <q-toggle v-model="showDeletedMessage" label="Show Deleted Programs"/>
        </div>
        <div class="row justify-end">
          <q-input standout v-model="search" @keydown.enter.prevent="reloadVM()" dense
            label="Search program by hash or name" class="q-mr-md">
            <template v-slot:prepend>
              <q-icon name="search" />
            </template>
          </q-input>
          <q-btn icon="refresh" class="q-mr-md" color="aleph-radial" :disabled="loading" :loading="loading"
            label="Reload" @click="reloadVM()" />
          <q-btn icon="add" color="aleph-radial" label="Create program" @click="showCreateProgram = true"
            :disabled="balance_info.ALEPH < 1" />
        </div>
      </div>
    </div>
    <div v-if="account">
      <!-- start: active vm -->
      <div class="q-mb-sm" v-show="!loading">
        <span v-if="showDeletedMessage" class="text-caption">{{this.programs.length}} programs ({{removeMessageCount}} deleted)</span>
        <span v-else class="text-caption">{{(this.programs.length - removeMessageCount)}} programs</span>
      </div>
      <VMTable :data="programs" :account="account" :loading="loading" :showDeletedMessage="showDeletedMessage">
      </VMTable>
      <!-- end: actives vm -->
    </div>
  </q-page>
</template>

<script>
import 'vue2-dropzone/dist/vue2Dropzone.min.css'
import { mapState } from 'vuex'
import VMTable from '../components/VMTable'
import { messages } from 'aleph-js'
import CreateNewVM from '../components/CreateNewVM'

export default {
  name: 'programs',
  components: {
    VMTable,
    CreateNewVM
  },
  computed: mapState({
    account: state => state.account,
    api_server: state => state.api_server,
    balance_info: state => state.balance_info,
    stored: 'stored'
  }),
  data() {
    return {
      loading: true,
      programs: [],
      removeMessageCount: 0,
      search: '',
      showDeletedMessage: true,
      showCreateProgram: false,
      id: '',
      agentVersion: '',
      tab: 'active'
    }
  },
  methods: {
    uploadVM(value) {
      this.showCreateProgram = value
      this.getMessages()
    },

    async getMessages() {
      this.loading = true
      this.removeMessageCount = 0
      var params = {
        addresses: [this.account.address],
        pagination: 1000,
        message_type: 'PROGRAM'
      }
      if (this.search.length > 0) {
        params.hashes = [this.search]
      }
      await messages.get_messages(params).then(async (response) => {
        this.programs = response.messages
        for (var i = 0; i < this.programs.length; i++) {
          let tx = this.programs[i].content?.code.ref
          console.log(this.programs[i].forgotten_by)
          if (this.programs[i].forgotten_by) {
            this.removeMessageCount += 1
          }
          // retrieve store messages
          if (tx) {
            await messages.get_messages({
              addresses: [this.account.address],
              hashes: [tx]
            }).then(async (response) => {
              this.programs[i].storeObj = response.messages[0].content
            }).catch((err) => {
              this.loading = false
              console.log(err)
              this.$q.notify({
                type: 'negative',
                message: `ERROR: ${err.message}`
              })
            })
          }
        }
        this.loading = false
      }).catch((err) => {
        this.loading = false
        console.log(err)
        this.$q.notify({
          type: 'negative',
          message: `ERROR: ${err.message}`
        })
      })
    },

    async reloadVM() {
      await this.getMessages()
    }
  },
  watch: {
    account(account) {
      this.$store.dispatch('update_stored')
      this.getMessages()
    }
  },
  async mounted() {
    this.getMessages()
  }
}
</script>

<style lang="scss">

</style>
