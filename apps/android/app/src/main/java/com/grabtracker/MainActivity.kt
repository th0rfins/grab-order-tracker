package com.grabtracker

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException

class MainActivity : ComponentActivity() {
    private val client = OkHttpClient()
    private var shared by mutableStateOf("")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (intent?.action == Intent.ACTION_SEND) {
            shared = intent.getStringExtra(Intent.EXTRA_TEXT).orEmpty()
        }
        setContent { Dashboard(shared, ::createOrder, ::refresh, ::open) }
    }

    private fun request(
        path: String,
        method: String = "GET",
        body: String? = null,
        done: (Result<String>) -> Unit,
    ) {
        val request = Request.Builder()
            .url(BuildConfig.API_BASE_URL + path)
            .apply {
                if (method == "POST") {
                    post((body ?: "{}").toRequestBody("application/json".toMediaType()))
                }
            }
            .build()
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                runOnUiThread { done(Result.failure(e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                response.use {
                    val text = it.body?.string().orEmpty()
                    runOnUiThread {
                        if (it.isSuccessful) done(Result.success(text))
                        else {
                            val message = try {
                                JSONObject(text).optString("error").ifBlank { "Request failed (${it.code})" }
                            } catch (_: Exception) {
                                "Request failed (${it.code})"
                            }
                            done(Result.failure(IOException(message)))
                        }
                    }
                }
            }
        })
    }

    private fun createOrder(url: String, done: (Result<Unit>) -> Unit) {
        request("/api/orders", "POST", JSONObject().put("url", url).toString()) {
            done(it.map { Unit })
        }
    }

    private fun refresh(done: (Result<String>) -> Unit) {
        request("/api/orders", done = done)
    }

    private fun open(url: String) {
        startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }
}

@Composable
private fun Dashboard(
    shared: String,
    create: (String, (Result<Unit>) -> Unit) -> Unit,
    refresh: ((Result<String>) -> Unit) -> Unit,
    open: (String) -> Unit,
) {
    var link by remember { mutableStateOf(shared) }
    var rows by remember { mutableStateOf(listOf<JSONObject>()) }
    var analytics by remember { mutableStateOf("Loading") }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    fun load() {
        refresh { result ->
            result.fold(
                onSuccess = { text ->
                    try {
                        val arr = JSONArray(text)
                        rows = (0 until arr.length()).map { arr.getJSONObject(it) }
                        analytics = "${rows.count { it.optString("status") == "ACTIVE" }} active  •  ${rows.size} total"
                        error = ""
                    } catch (_: Exception) {
                        error = "Could not read orders response"
                    }
                },
                onFailure = { error = it.message ?: "Could not load orders" },
            )
        }
    }

    LaunchedEffect(Unit) { load() }
    MaterialTheme {
        Scaffold { pad ->
            Column(Modifier.fillMaxSize().padding(pad).padding(20.dp)) {
                Text("Grab Tracker", style = MaterialTheme.typography.headlineMedium)
                Text(analytics)
                Spacer(Modifier.height(16.dp))
                OutlinedTextField(
                    link,
                    { link = it },
                    label = { Text("Grab share link") },
                    modifier = Modifier.fillMaxWidth(),
                    enabled = !busy,
                )
                Button(
                    onClick = {
                        busy = true
                        error = ""
                        create(link) { result ->
                            busy = false
                            result.fold(
                                onSuccess = { link = ""; load() },
                                onFailure = { error = it.message ?: "Could not add link" },
                            )
                        }
                    },
                    enabled = !busy && link.isNotBlank(),
                    modifier = Modifier.padding(top = 8.dp),
                ) {
                    Text(if (busy) "Adding..." else "Track order")
                }
                if (error.isNotBlank()) {
                    Text(error, color = MaterialTheme.colorScheme.error)
                }
                Spacer(Modifier.height(16.dp))
                LazyColumn {
                    items(rows) { row ->
                        Card(
                            Modifier.fillMaxWidth().padding(vertical = 5.dp)
                                .clickable { open(row.optString("url")) },
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Text(row.optString("status"))
                                Text(row.optString("created_at"))
                                Text("Open tracking in browser")
                            }
                        }
                    }
                }
            }
        }
    }
}
