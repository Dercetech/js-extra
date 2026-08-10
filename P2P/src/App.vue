<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import Peer from 'peerjs'

const myId = ref('Getting an ID…')
const otherId = ref('')
const message = ref('')
const messages = ref([])
const status = ref('Connecting to the signalling server…')
const statusType = ref('waiting')
const activeConnection = shallowRef(null)
const isConnected = ref(false)

let peer = null

const canDisconnect = computed(() => activeConnection.value !== null)

function errorText(error) {
  return error?.message || error?.type || String(error)
}

function addConnection(connection) {
  if (activeConnection.value && activeConnection.value !== connection) {
    activeConnection.value.close()
  }

  activeConnection.value = connection
  isConnected.value = false
  status.value = `Connecting to ${connection.peer}…`
  statusType.value = 'waiting'

  connection.on('open', () => {
    if (activeConnection.value !== connection) return
    isConnected.value = true
    status.value = `Connected to ${connection.peer}`
    statusType.value = 'connected'
    console.log('P2P connection established with:', connection.peer)
  })

  connection.on('data', (data) => {
    console.log('Received:', data)
    messages.value.push({ from: connection.peer, text: String(data) })
  })

  connection.on('close', () => {
    console.log('P2P connection closed:', connection.peer)
    if (activeConnection.value !== connection) return
    activeConnection.value = null
    isConnected.value = false
    status.value = `${connection.peer} disconnected`
    statusType.value = 'disconnected'
  })

  connection.on('error', (error) => {
    console.error('P2P connection error:', error)
    if (activeConnection.value !== connection) return
    isConnected.value = false
    status.value = `Connection error: ${errorText(error)}`
    statusType.value = 'disconnected'
  })
}

function connect() {
  const id = otherId.value.trim()
  if (!peer?.open || !id) return

  if (id === myId.value) {
    status.value = 'Enter the ID from the other browser'
    statusType.value = 'disconnected'
    return
  }

  console.log('Connecting to:', id)
  addConnection(peer.connect(id, { reliable: true }))
}

function sendMessage() {
  const text = message.value.trim()
  if (!isConnected.value || !text) return

  activeConnection.value.send(text)
  console.log('Sent:', text)
  messages.value.push({ from: 'You', text })
  message.value = ''
}

function disconnect() {
  const connection = activeConnection.value
  if (!connection) return

  activeConnection.value = null
  isConnected.value = false
  connection.close()
  status.value = `Disconnected from ${connection.peer}`
  statusType.value = 'disconnected'
  console.log('Disconnected from:', connection.peer)
}

function closeEverything() {
  activeConnection.value?.close()
  peer?.destroy()
}

onMounted(() => {
  peer = new Peer(undefined, {
    host: 'p2p.blackthornwinter.com',
    port: 443,
    path: '/rtc',
    key: 'peerjs',
    secure: true,
    debug: 2,
  })

  peer.on('open', (id) => {
    myId.value = id
    status.value = 'Ready — give your ID to someone'
    statusType.value = 'ready'
    console.log('Your peer ID:', id)
  })

  peer.on('connection', (connection) => {
    console.log('Incoming connection from:', connection.peer)
    addConnection(connection)
  })

  peer.on('disconnected', () => {
    console.warn('Lost the signalling-server connection')
    if (!isConnected.value) {
      status.value = 'Signalling server disconnected'
      statusType.value = 'disconnected'
    }
  })

  peer.on('error', (error) => {
    console.error('PeerJS error:', error)
    status.value = `Error: ${errorText(error)}`
    statusType.value = 'disconnected'
  })

  window.addEventListener('beforeunload', closeEverything)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', closeEverything)
  closeEverything()
})
</script>

<template>
  <main>
    <h1>Simple P2P Chat</h1>

    <p class="your-id">
      Your ID:
      <strong data-testid="my-id">{{ myId }}</strong>
    </p>

    <p class="status" :class="statusType" role="status">
      {{ status }}
    </p>

    <form class="row" @submit.prevent="connect">
      <label for="other-id">Someone else's ID</label>
      <input
        id="other-id"
        v-model="otherId"
        autocomplete="off"
        placeholder="Paste their ID"
      />
      <button type="submit" :disabled="!peer?.open || !otherId.trim()">
        Connect
      </button>
      <button type="button" class="secondary" :disabled="!canDisconnect" @click="disconnect">
        Disconnect
      </button>
    </form>

    <form class="row" @submit.prevent="sendMessage">
      <label for="message">Message</label>
      <input
        id="message"
        v-model="message"
        autocomplete="off"
        placeholder="Hello!"
      />
      <button type="submit" :disabled="!isConnected || !message.trim()">
        Send
      </button>
    </form>

    <section>
      <h2>Messages</h2>
      <p v-if="messages.length === 0" class="empty">No messages yet.</p>
      <ul v-else>
        <li v-for="(item, index) in messages" :key="index">
          <strong>{{ item.from }}:</strong> {{ item.text }}
        </li>
      </ul>
    </section>
  </main>
</template>
