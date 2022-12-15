<template>
  <div>
    <q-dialog v-model="delete_prompt">
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Are you sure?</div>
          <div class="text-body2 q-mt-md">You are about to delete a program</div>
          <div class="text-body2 q-my-md">Leave a note for future reference. (Optional)</div>
          <div class="text-body2">
            <q-input ref="delete_field" standout v-model="selected_message.reason" label="Enter note" />
          </div>
          <div class="text-body2 q-mt-md">In order to confirm your action, please enter <span class="text-weight-bold">
              DELETE</span> in capital letters.</div>
        </q-card-section>

        <q-card-section class="q-pt-none">
          <q-input ref="delete_field" standout v-model="delete_field" label="Type DELETE here"
            :rules="[delete_rules]" />
        </q-card-section>

        <q-card-actions align="right" class="text-primary">
          <q-btn flat label="Cancel" v-close-popup color="grey" hover="white" />
          <q-btn color="aleph-radial" label="Delete" :disable="delete_field !== 'DELETE'" :loading="loading"
            @click="forgetMessage(selected_message)" />
        </q-card-actions>
      </q-card>
    </q-dialog>
    <div v-if="!loading">
      <q-expansion-item
        v-for="item of data"
        class="overflow-hidden rounded-borders q-mb-md"
        :key="item?.item_hash"
        :label="getProgramLabel(item)"
        expand-icon-class="text-white"
        v-show="showDeletedMessage ? item.content === null : item.content"
        :header-class="'bg-expand text-white ' + ($q.dark.isActive ? 'bg-dark-40' : 'bg-aleph-radial')"
        flat
      >
      <template v-slot:header>
        <q-item-section avatar>
          <q-icon :name="item.forgotten_by ? 'delete' : 'computer'" />
        </q-item-section>
        <q-item-section>
          <span class="lt-md">{{getProgramLabel(item, true)}}</span>
          <span class="gt-sm">{{getProgramLabel(item)}}</span>
        </q-item-section>
      </template>
        <q-card  class="bg-card-expand rounded-borders" :bordered="!$q.dark.isActive">
          <q-card-section horizontal>
            <q-list class="col q-my-sm">
              <q-item v-show="!item.forgotten_by && !('extra_fields' in item.content) && item.content?.metadata?.name">
                <q-item-section>
                  <q-item-label caption>Name</q-item-label>
                  <q-item-label>
                    {{item.content?.metadata?.name}}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Item Hash</q-item-label>
                  <q-item-label>
                    {{ellipseAddress(item.item_hash)}}
                    <q-btn @click="copyToClipboard(item.item_hash)" flat round icon="content_copy" size="sm"/>
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-show="!item.forgotten_by">
                <q-item-section>
                  <q-item-label caption>Direct link</q-item-label>
                  <q-item-label color="white">
                    <a :href="`https://aleph.sh/vm/${item?.item_hash}`" target="_blank"
                      style="color:white;">https://aleph.sh/vm/{{ item?.item_hash }}</a>
                    <q-btn @click="copyToClipboard(`https://aleph.sh/vm/${item?.item_hash}`)" flat round
                      icon="content_copy" size="sm" />
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item v-show="!item.forgotten_by">
                <q-item-section>
                  <q-item-label caption>Size</q-item-label>
                  <q-item-label class="text-body2 overflow-hidden">
                    {{ item.storeObj ? item.storeObj.size : 'Null' }} B
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Date</q-item-label>
                  <q-item-label class="text-body2 overflow-hidden">
                    {{ convertTimestamp(item?.time) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Channel</q-item-label>
                  <q-item-label>
                    {{ item?.channel }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <q-separator vertical />

            <q-card-actions vertical class="justify-start q-px-md">
              <q-btn v-show="!item.forgotten_by" flat icon="play_arrow" align="left" label="Open app" @click="openApp(item)" />
              <q-btn flat icon="link" align="left" label="View Explorer" @click="openExplorer(item)" />
              <q-btn v-show="!item.forgotten_by" flat icon="upload_file" align="left" label="Download Program File"
                @click="downloadFile(item?.storeObj.item_hash)" />
              <q-btn v-show="!item.forgotten_by" flat icon="delete" align="left" label="Delete" @click="show_delete_prompt(item)" />
            </q-card-actions>
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </div>
    <div v-else>
      <q-card flat class="bg-card-expand rounded-borders" :bordered="!$q.dark.isActive">
        <q-skeleton class="q-py-sm" type="rect" />
      </q-card>
    </div>
  </div>
</template>

<script>

import { convertTimestamp, ellipseAddress } from '../helpers/utilities'
import { broadcast, ethereum, solana } from 'aleph-js'
import { copyToClipboard } from 'quasar'
const shajs = require('sha.js')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export default {
  props: [
    'account',
    'data',
    'loading',
    'showDeletedMessage'
  ],
  data() {
    return {
      convertTimestamp: convertTimestamp,
      ellipseAddress: ellipseAddress,
      copyToClipboard: copyToClipboard,
      filter: '',
      columns: [
        { name: 'channel', label: 'Channel', field: 'channel', align: 'left' },
        { name: 'chain', label: 'Chain', field: 'chain' },
        { name: 'item_hash', label: 'Item Hash', field: 'item_hash' },
        { name: 'time', label: 'Time', field: 'time', sortable: true },
        { name: 'size', label: 'Size', field: 'size', sortable: true }
      ],
      selected_message: {
        reason: 'None'
      },
      delete_prompt: false,
      delete_field: ''
    }
  },
  methods: {
    delete_rules(val) {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(!!val && val === 'DELETE' || 'please enter DELETE in capital letters')
        }, 500)
      })
    },
    show_delete_prompt(message) {
      this.delete_prompt = true
      this.selected_message = message
    },
    openExplorer(message) {
      const explorerURL = `https://explorer.aleph.im/address/ETH/${this.account.address}/message/PROGRAM/${message.item_hash}`
      window.open(explorerURL, '_blank')
    },

    openApp(message) {
      const explorerURL = `https://aleph.sh/vm/${message.item_hash}`
      window.open(explorerURL, '_blank')
    },

    downloadFile(item_hash) {
      const urlToSend = `http://api2.aleph.im/api/v0/storage/raw/${item_hash}`
      var req = new XMLHttpRequest()
      req.open('GET', urlToSend, true)
      req.responseType = 'blob'
      req.onload = function (event) {
        var blob = req.response
        var fileName = `${item_hash}.zip` // if you have the fileName header available
        var link = document.createElement('a')
        link.href = window.URL.createObjectURL(blob)
        link.download = fileName
        link.click()
      }
      req.send()
    },

    async putContent(message, content, inline_requested, api_server) {
      let inline = inline_requested
      if (inline) {
        let serialized = JSON.stringify(content)
        if (serialized.length > 150000) {
          inline = false
        } else {
          message.item_type = 'inline'
          message.item_content = serialized
          message.item_hash = new shajs.sha256().update(serialized).digest('hex')
        }
      }
    },

    async send(message) {
      if (this.account.type === 'ETH') {
        message = await ethereum.sign(this.account, message)
      } else if (this.account.type === 'SOL') {
        message = await solana.sign(this.account, message)
      }
      await broadcast(message, { api_server: this.api_server })
    },

    async forgetMessage(item) {
      const timestamp = Date.now() / 1000
      const content = {
        address: this.account.address,
        time: timestamp,
        hashes: [item.item_hash],
        reason: item.reason?.length > 0 ? item.reason : 'None'
      }
      const message = {
        chain: item.chain,
        sender: item.sender,
        type: 'FORGET',
        channel: 'FORGET',
        confirmed: false,
        signature: '',
        size: 0,
        time: timestamp,
        item_type: item.item_type,
        item_content: '',
        item_hash: '',
        content: content,
      }

      await this.putContent(message, content, true, 'https://api2.aleph.im').catch((err) => {
        this.$q.notify({
                type: 'negative',
                message: `ERROR: ${err.message}`
              })
      })

      await sleep(1000)

      await this.send(message)
        .then(() => {
          this.$store.dispatch('update_stored')
          this.delete_prompt = false
        })
        .catch((err) => {
          this.$q.notify({
                type: 'negative',
                message: `ERROR: ${err.message}`
              })
        })
    },

    getProgramLabel (program, ellipse = false) {
      if (program.content === null) {
        return ellipse ? `${ellipseAddress(program.item_hash)}` : program.item_hash
      }
      if (!('extra_fields' in program?.content)) {
        if (program.content?.metadata?.name) {
          return `${program.content?.metadata?.name} (${ellipseAddress(program.item_hash)})`
        } else {
          return ellipse ? ellipseAddress(program.item_hash) : program.item_hash
        }
      }
      return program.content.extra_fields.program_name
    }
  }
}
</script>
