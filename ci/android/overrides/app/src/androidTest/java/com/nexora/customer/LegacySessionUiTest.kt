package com.nexora.customer

import android.content.Context
import com.nexora.customer.data.SecureSessionStore
import androidx.test.core.app.ActivityScenario
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaType
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LegacySessionUiTest {
    @Test fun encryptedLegacySessionMigratesAndHydratesProfile() {
        val i=InstrumentationRegistry.getInstrumentation();val args=InstrumentationRegistry.getArguments()
        val email=requireNotNull(args.getString("qaEmail"));val password=requireNotNull(args.getString("qaPassword"))
        require(email.startsWith("qa-android-")&&email.endsWith("@example.invalid"))
        val request=Request.Builder().url(BuildConfig.SUPABASE_URL+"/auth/v1/token?grant_type=password")
            .header("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY)
            .post(JSONObject().put("email",email).put("password",password).toString().toRequestBody("application/json".toMediaType())).build()
        val session=OkHttpClient().newCall(request).execute().use { response ->
            assertTrue("QA legacy authentication failed",response.isSuccessful)
            JSONObject(requireNotNull(response.body).string()).apply { if(!has("expires_at"))put("expires_at",System.currentTimeMillis()/1000+getLong("expires_in")) }.toString()
        }
        val h=CustomerUiTest()
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            h.until(s,"Home missing","!!document.querySelector('.cr-app nav')")
            h.js(s,"localStorage.removeItem('studioflow_supabase_session')")
        }
        val context=i.targetContext
        context.getSharedPreferences("MainActivity",Context.MODE_PRIVATE).edit().remove("legacy_migrated").commit()
        SecureSessionStore(context).write(session)
        ActivityScenario.launch(MainActivity::class.java).use { s ->
            h.until(s,"Migrated home missing","!!document.querySelector('.cr-app nav')");h.tab(s,"Profile")
            h.until(s,"Legacy account was not restored","document.body.innerText.includes('Nexora Android QA')")
            h.js(s,"Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Edit profile')?.click()")
            h.until(s,"Migrated registration details missing","document.querySelector('input[autocomplete=tel]')?.value==='+919876543210'&&document.querySelector('.customer-birth-date input')?.value==='2000-02-09'")
            h.screenshot("legacy-session-prefilled")
            h.js(s,"document.querySelector('button[aria-label=\\\"Back to profile\\\"]')?.click()")
            h.js(s,"Array.from(document.querySelectorAll('button')).find(x=>x.textContent.trim()==='Log Out')?.click()")
            h.until(s,"Legacy logout failed","document.body.innerText.includes('Sign in / Create customer account')&&localStorage.getItem('studioflow_supabase_session')===null")
            // AndroidJUnitRunner force-stops the process after this class. Allow Chromium's
            // asynchronous local-storage disk commit to finish before that forced termination.
            Thread.sleep(5500)
        }
        assertTrue("Migration flag missing",context.getSharedPreferences("MainActivity",Context.MODE_PRIVATE).getBoolean("legacy_migrated",false))
        val end=System.currentTimeMillis()+10000
        while(SecureSessionStore(context).read()!=null&&System.currentTimeMillis()<end)Thread.sleep(200)
        assertNull("Legacy session retained after logout",SecureSessionStore(context).read())
    }
}
