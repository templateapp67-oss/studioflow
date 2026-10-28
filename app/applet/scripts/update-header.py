with open('src/components/CustomerWebsiteHeader.tsx', 'r') as f:
    content = f.read()

# Replace desktop nav
target1 = '<nav className="hidden lg:flex items-center gap-7" aria-label="Website navigation">'
replace1 = '<nav className="sf-header-links hidden lg:flex items-center gap-7" aria-label="Website navigation">'
assert target1 in content, "target1 not found"
content = content.replace(target1, replace1)

# In the desktop nav, replace keshLinks with links
target2 = '{keshLinks.map(link=>('
replace2 = '{links.map(link=>('
assert target2 in content, "target2 not found"
# Replace first occurrence (desktop nav) and second occurrence (mobile nav)
content = content.replace(target2, replace2)

# Update drawer id and label
content = content.replace('id="kesh-mobile-menu"', 'id="salon-mobile-menu"')
content = content.replace('aria-label="Kesh Prakriti Website Menu"', 'aria-label="Website menu"')
content = content.replace('onClick={event=>select(event,link)}', 'onClick={event=>{close();select(event,link);}}')

# Add mobileTabs before closing </header> of isKeshPrakriti
old_closing = '''    </header>
  );
 }

 if(isPinkyNails){'''

new_closing = '''     {mobileTabs.length>0&&(
      <nav className="sf-mobile-tabs" aria-label="Mobile quick navigation">
       {mobileTabs.map(link=>{const Icon=tabIcons[link.id as keyof typeof tabIcons];return <a key={link.id} href={link.href} aria-label={t(link.label)} aria-current={active===link.id?'location':undefined} onClick={event=>select(event,link)}><Icon size={19}/><span>{t(link.id==='bookings'?'Bookings':link.label)}</span></a>;})}
      </nav>
     )}
    </header>
  );
 }

 if(isPinkyNails){'''

assert old_closing in content, "old_closing not found"
content = content.replace(old_closing, new_closing)

with open('src/components/CustomerWebsiteHeader.tsx', 'w') as f:
    f.write(content)

print("HEADER UPDATED SUCCESSFULLY")
