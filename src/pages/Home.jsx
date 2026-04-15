import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlignJustify,
  ArrowRight,
  CalendarDays,
  Coffee,
  LayoutDashboard,
  LogOut,
  MapPin,
  Star,
  UserRound,
  X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const defaultCategories = [
  'Coffee',
  'Cold Brews',
  'Shakes',
  'Snacks',
  'Desserts',
  'Combos',
]

function onlineDishImage(name, category = 'cafe food') {
  const query = [name, category, 'food', 'dish']
    .filter(Boolean)
    .join(',')
  return `https://source.unsplash.com/720x520/?${encodeURIComponent(query)}`
}

const defaultBestSellers = [
  {
    name: 'Nutella Butter Latte',
    desc: 'Velvety espresso with nutella cream and toasted cocoa dust.',
    rating: 4.9,
    image: onlineDishImage('Nutella Butter Latte', 'coffee latte'),
    isVeg: true,
  },
  {
    name: 'Great Indian Filter Coffee',
    desc: 'Aromatic decoction-style brew with balanced strength and depth.',
    rating: 4.8,
    image: onlineDishImage('Great Indian Filter Coffee', 'filter coffee'),
    isVeg: true,
  },
  {
    name: 'Berry Blast',
    desc: 'Bright berry-forward cooler with subtle citrus and mint finish.',
    rating: 4.7,
    image: onlineDishImage('Berry Blast', 'fruit mocktail'),
    isVeg: true,
  },
  {
    name: 'Cold Brew',
    desc: 'Slow extracted overnight for a smooth, low-acidity profile.',
    rating: 4.8,
    image: onlineDishImage('Cold Brew', 'cold coffee'),
    isVeg: true,
  },
  {
    name: 'Loaded Fries',
    desc: 'Golden fries with house seasoning and creamy signature drizzle.',
    rating: 4.6,
    image: onlineDishImage('Loaded Fries', 'french fries'),
    isVeg: true,
  },
  {
    name: 'Grilled Sandwich',
    desc: 'Crunchy grilled bread layered with fresh fillings and cheese.',
    rating: 4.8,
    image: onlineDishImage('Grilled Sandwich', 'sandwich'),
    isVeg: true,
  },
]

const defaultStoryBlocks = [
  {
    title: 'True to its origin',
    text: 'Grown in South India at an altitude of 4500 ft, Qaffeine beans are harvested with care and roasted to preserve authentic character in every sip.',
    image: 'https://picsum.photos/seed/qaf-farm/920/640',
  },
  {
    title: 'Many takes, single blend',
    text: 'From classic filter coffee to experimental lattes and shakes, we roast and brew one quality-forward blend remembered by everyone who visits.',
    image: 'https://picsum.photos/seed/qaf-roastery/920/640',
  },
  {
    title: 'Taste the Qaffeine Difference',
    text: 'From first step in till the final sip, each cup is designed to be crisp, bright, and energizing with a profile that feels distinctly Qaffeine.',
    image: 'https://picsum.photos/seed/qaf-cup/920/640',
  },
]

const fallbackOutlets = [
  {
    id: '1',
    name: 'Centaurus by Phoenix',
    address: 'Neopolis, Kokapet, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/eLc6bFX1byfZ9KE26',
    is_open: true,
  },
  {
    id: '2',
    name: 'My Home Bhooja',
    address: 'Kokapet, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/mSR1RUn6RUR2WzPH7',
    is_open: true,
  },
  {
    id: '3',
    name: 'Moosarambagh',
    address: 'Moosarambagh, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/NUF8sqSXNDC2n6YL8',
    is_open: true,
  },
  {
    id: '4',
    name: 'Secunderabad',
    address: 'Secunderabad, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/FFBkFFUSr1qNwBeq8',
    is_open: true,
  },
  {
    id: '5',
    name: 'GVK One Mall',
    address: 'Banjara Hills, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/1VerCU3S7T2uQmfS6',
    is_open: true,
  },
  {
    id: '6',
    name: 'Yashoda Hospitals Hitech City',
    address: 'Hitech City, Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/Vr1ZHNtGvXGomcHJ9',
    is_open: true,
  },
  {
    id: '7',
    name: 'Qaffeine Bistro',
    address: 'Hyderabad',
    google_maps_url: 'https://maps.app.goo.gl/mLi6zaZXdrdVK2bg7',
    is_open: true,
  },
]

const navItems = [
  { label: 'Home', href: '#home' },
  { label: 'Menu & Order', href: '/menu-order' },
  { label: 'Reservations', href: '/reservations' },
  { label: 'Order Details', href: '/order-details' },
]

const instagramImages = Array.from({ length: 6 }).map((_, index) => ({
  id: index,
  src: `https://picsum.photos/seed/qaf-insta-${index + 1}/360/360`,
}))

const fallbackReviews = [
  {
    name: 'Ananya R.',
    review: 'Loved the vibe and the coffee profile. Nutella Butter Latte was super smooth and perfectly balanced.',
    rating: 5,
    source: 'Guest Review',
  },
  {
    name: 'Rahul K.',
    review: 'Great place to work for a couple of hours. Fast service, clean tables, and consistent brew quality.',
    rating: 5,
    source: 'Guest Review',
  },
  {
    name: 'Sana M.',
    review: 'The food pairing is surprisingly good. Filter coffee plus grilled sandwich is now my fixed order.',
    rating: 4,
    source: 'Guest Review',
  },
  {
    name: 'Pranav S.',
    review: 'Friendly staff and a bright ambience. Good for quick takeaway and dine-in both.',
    rating: 4,
    source: 'Guest Review',
  },
]

const defaultOrderFlowSteps = [
  {
    title: 'Session Start',
    desc: 'Open ordering from QR or direct menu access with branch-aware context.',
    tone: 'scan',
  },
  {
    title: 'Basket Build',
    desc: 'Add beverages and food with real-time totals, quantity edits, and smart grouping.',
    tone: 'build',
  },
  {
    title: 'Kitchen Pipeline',
    desc: 'Track preparation stages in one operational timeline from confirmation to ready.',
    tone: 'brew',
  },
  {
    title: 'Handover',
    desc: 'Receive completion updates when the order is served at table or ready for pickup.',
    tone: 'serve',
  },
]

const defaultWhyCards = [
  {
    title: 'Hand Selected Coffee',
    text: 'Single-origin beans from South India estates, selectively harvested and carefully profiled for rich character.',
  },
  {
    title: 'Bean to Brew',
    text: 'From farm to cup, beans are transformed through controlled roasting and precision brewing by trained baristas.',
  },
  {
    title: 'Your Qaffeine Cup',
    text: 'Distinct taste and a perfect caffeine kick designed to match the way you like your coffee moments.',
  },
]

const defaultHero = {
  pill: 'Fresh Roasted Daily · Single Origin',
  headline: ['Single Origin.', 'Well Grounded.', 'Quintessentially, Coffee.'],
  subtext:
    'Grown at 4500 ft in South India and served across 7 outlets in Hyderabad. At Qaffeine, every cup brings together craft roasting, thoughtful food pairing, and a bright cafe experience.',
  special_title: "Today's Special",
  special_item: 'Nutella Butter Latte',
  special_note: 'Signature house favorite.',
}

function initialsFromName(name, email) {
  const value = String(name || email || '').trim()
  if (!value) return 'QF'
  const pieces = value.split(/\s+/).filter(Boolean)
  if (pieces.length === 1) return pieces[0].slice(0, 2).toUpperCase()
  return `${pieces[0][0] || ''}${pieces[1][0] || ''}`.toUpperCase()
}

function BeanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3C7.3 3 4 6.7 4 12s3.3 9 8 9 8-3.7 8-9-3.3-9-8-9Zm0 0c2.2 2.3 3.5 5.5 3.5 9S14.2 18.7 12 21"
        stroke="#C8853A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function InstagramGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  )
}

function FacebookGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 8H16V5h-2c-2.2 0-3.5 1.3-3.5 3.7V11H8v3h2.5v5h3v-5h2.2l.3-3h-2.5V8.9c0-.7.3-.9 1-.9Z"
        fill="currentColor"
      />
    </svg>
  )
}

function normalizeIncomingReview(row, index = 0, defaultSource = 'Guest Review') {
  const reviewText = String(
    row?.review || row?.text?.text || row?.text || row?.comment || '',
  ).trim()

  if (!reviewText) return null

  const name = String(
    row?.name || row?.authorAttribution?.displayName || row?.author_name || `Qaffeine Customer ${index + 1}`,
  ).trim()

  const ratingRaw = Number(row?.rating || row?.stars || 5)
  const rating = Number.isFinite(ratingRaw) ? Math.max(1, Math.min(5, ratingRaw)) : 5

  return {
    name,
    review: reviewText,
    rating,
    source: String(row?.source || defaultSource),
  }
}

export default function Home() {
  const { user, role, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const otpApiBase = String(import.meta.env.VITE_OTP_API_BASE_URL || 'http://localhost:8787').replace(/\/$/, '')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [branches, setBranches] = useState([])
  const [customerReviews, setCustomerReviews] = useState(fallbackReviews)
  const [websiteContent, setWebsiteContent] = useState({})

  const goToBestSeller = (itemName) => {
    navigate(`/menu-order?focus=${encodeURIComponent(itemName)}`)
  }

  const goToLogin = () => {
    setMobileOpen(false)
    if (user?.id) {
      if (role === 'admin') {
        navigate('/admin')
        return
      }
      if (role === 'staff') {
        navigate('/staff/dashboard')
        return
      }
      navigate('/profile')
      return
    }

    navigate('/login')
  }

  useEffect(() => {
    if (!mobileOpen) return undefined

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [mobileOpen])

  useEffect(() => {
    if (!profileMenuOpen) return undefined

    const onWindowClick = () => setProfileMenuOpen(false)
    window.addEventListener('click', onWindowClick)

    return () => {
      window.removeEventListener('click', onWindowClick)
    }
  }, [profileMenuOpen])

  useEffect(() => {
    let active = true

    const fetchBranches = async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, address, google_maps_url, is_open')
        .order('created_at', { ascending: true })

      if (!active) return

      if (error || !data?.length) {
        setBranches(fallbackOutlets)
        return
      }

      setBranches(data)
    }

    fetchBranches()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const fetchWebsiteContent = async () => {
      const { data, error } = await supabase
        .from('website_content')
        .select('key, value')
        .in('key', [
          'home_hero',
          'home_categories',
          'home_best_sellers',
          'home_why_cards',
          'home_story_blocks',
          'home_order_flow_steps',
        ])

      if (!active || error || !data?.length) return

      const next = {}
      for (const row of data) next[row.key] = row.value
      setWebsiteContent(next)
    }

    fetchWebsiteContent()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    const loadGoogleReviews = async () => {
      try {
        const reviewResponse = await fetch(`${otpApiBase}/api/reviews/public?limit=12`)
        if (reviewResponse.ok) {
          const reviewPayload = await reviewResponse.json().catch(() => ({}))
          const appReviews = (reviewPayload?.reviews || [])
            .map((row, index) => normalizeIncomingReview(row, index, 'Qaffeine Customer'))
            .filter(Boolean)
          if (active && appReviews.length) {
            setCustomerReviews(appReviews)
            return
          }
        }
      } catch {
        // Continue to Google/fallback reviews.
      }

      const placeId = import.meta.env.VITE_GOOGLE_PLACE_ID

      if (!placeId) return

      try {
        const response = await fetch(`${otpApiBase}/api/google/reviews?placeId=${encodeURIComponent(placeId)}`)

        if (!response.ok) return
        const payload = await response.json()

        const transformed = (payload?.reviews || payload?.data?.reviews || [])
          .map((row, index) => normalizeIncomingReview(row, index, 'Google Review'))
          .filter(Boolean)
          .slice(0, 12)

        if (!active || !transformed.length) return
        setCustomerReviews(transformed)
      } catch {
        // Keep fallback reviews when local proxy is unavailable.
      }
    }

    loadGoogleReviews()

    return () => {
      active = false
    }
  }, [])

  const outlets = useMemo(
    () => (branches.length ? branches : fallbackOutlets),
    [branches],
  )

  const heroContent = useMemo(() => {
    const hero = websiteContent.home_hero
    if (!hero || typeof hero !== 'object') return defaultHero
    return {
      pill: String(hero.pill || defaultHero.pill),
      headline: Array.isArray(hero.headline) && hero.headline.length ? hero.headline.slice(0, 3).map((line) => String(line)) : defaultHero.headline,
      subtext: String(hero.subtext || defaultHero.subtext),
      special_title: String(hero.special_title || defaultHero.special_title),
      special_item: String(hero.special_item || defaultHero.special_item),
      special_note: String(hero.special_note || defaultHero.special_note),
    }
  }, [websiteContent.home_hero])

  const categories = useMemo(() => {
    const rows = websiteContent.home_categories
    if (!Array.isArray(rows) || !rows.length) return defaultCategories
    return rows.map((row) => String(row)).filter(Boolean)
  }, [websiteContent.home_categories])

  const bestSellers = useMemo(() => {
    const rows = websiteContent.home_best_sellers
    if (!Array.isArray(rows) || !rows.length) return defaultBestSellers
    return rows.map((row, index) => ({
      name: String(row?.name || `Item ${index + 1}`),
      desc: String(row?.desc || 'Qaffeine signature selection.'),
      rating: Number(row?.rating || 4.8),
      image: String(row?.image || onlineDishImage(String(row?.name || `Item ${index + 1}`))),
      isVeg: row?.isVeg !== false,
    }))
  }, [websiteContent.home_best_sellers])

  const whyCards = useMemo(() => {
    const rows = websiteContent.home_why_cards
    if (!Array.isArray(rows) || !rows.length) return defaultWhyCards
    return rows.map((row, index) => ({
      title: String(row?.title || `Quality Pillar ${index + 1}`),
      text: String(row?.text || 'Freshly curated quality note.'),
    }))
  }, [websiteContent.home_why_cards])

  const storyBlocks = useMemo(() => {
    const rows = websiteContent.home_story_blocks
    if (!Array.isArray(rows) || !rows.length) return defaultStoryBlocks
    return rows.map((row, index) => ({
      title: String(row?.title || `Story ${index + 1}`),
      text: String(row?.text || 'Qaffeine craft story.'),
      image: String(row?.image || `https://picsum.photos/seed/qaf-story-${index + 1}/920/640`),
    }))
  }, [websiteContent.home_story_blocks])

  const orderFlowSteps = useMemo(() => {
    const rows = websiteContent.home_order_flow_steps
    if (!Array.isArray(rows) || !rows.length) return defaultOrderFlowSteps
    return rows.map((row, index) => ({
      title: String(row?.title || `Step ${index + 1}`),
      desc: String(row?.desc || 'Operational stage.'),
      tone: ['scan', 'build', 'brew', 'serve'].includes(String(row?.tone || '')) ? String(row.tone) : 'build',
    }))
  }, [websiteContent.home_order_flow_steps])

  const marqueeReviews = useMemo(() => {
    const safe = (Array.isArray(customerReviews) ? customerReviews : [])
      .map((row, index) => normalizeIncomingReview(row, index, 'Guest Review'))
      .filter(Boolean)

    const source = safe.length ? safe : fallbackReviews
    const minCards = 10
    const output = []

    for (let i = 0; i < minCards; i += 1) {
      output.push(source[i % source.length])
    }

    return output
  }, [customerReviews])

  return (
    <div className="qf-home">
      <header className="qf-nav-wrap">
        <nav className="qf-nav">
          <a href="#home" className="qf-logo">
            <BeanIcon />
            <span>Qaffeine</span>
          </a>

          <div className="qf-nav-center">
            {navItems.map((item) => (
              item.href.startsWith('/') ? (
                <Link key={item.label} to={item.href}>
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href}>
                  {item.label}
                </a>
              )
            ))}
          </div>

          <div className="qf-nav-right">
            {!user?.id ? (
              <button type="button" className="qf-login-btn" onClick={goToLogin}>
                Login
              </button>
            ) : (
              <div className="qf-user-menu-wrap" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className="qf-avatar-btn"
                  onClick={() => setProfileMenuOpen((prev) => !prev)}
                  aria-label="Open profile menu"
                >
                  <span>{initialsFromName(profile?.full_name, user?.email)}</span>
                </button>

                {profileMenuOpen ? (
                  <div className="qf-user-dropdown">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        navigate('/profile')
                      }}
                    >
                      <LayoutDashboard size={15} /> Customer Dashboard
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false)
                        signOut().catch((error) => {
                          console.error('Sign out failed:', error)
                        })
                      }}
                    >
                      <LogOut size={15} /> Logout
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <button
              className="qf-hamburger"
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
            >
              <AlignJustify size={20} />
            </button>
          </div>
        </nav>

        {mobileOpen ? (
          <div className="qf-mobile-overlay" onClick={() => setMobileOpen(false)}>
            <aside className="qf-mobile-sheet" onClick={(event) => event.stopPropagation()}>
              <div className="qf-mobile-head">
                <p>Qaffeine</p>
                <button
                  className="qf-mobile-close"
                  aria-label="Close menu"
                  onClick={() => setMobileOpen(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="qf-mobile-links">
                {navItems.map((item) => (
                  item.href.startsWith('/') ? (
                    <Link key={item.label} to={item.href} onClick={() => setMobileOpen(false)}>
                      {item.label}
                    </Link>
                  ) : (
                    <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)}>
                      {item.label}
                    </a>
                  )
                ))}
                {!user?.id ? (
                  <button type="button" className="qf-mobile-login-btn" onClick={goToLogin}>
                    Login
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="qf-mobile-login-btn"
                      onClick={() => {
                        setMobileOpen(false)
                        navigate('/profile')
                      }}
                    >
                      <UserRound size={18} /> Customer Dashboard
                    </button>
                    <button
                      type="button"
                      className="qf-mobile-login-btn"
                      onClick={() => {
                        setMobileOpen(false)
                        signOut().catch((error) => {
                          console.error('Sign out failed:', error)
                        })
                      }}
                    >
                      <LogOut size={18} /> Logout
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        ) : null}
      </header>

      <main>
        <section className="qf-hero" id="home">
          <div className="qf-hero-left">
            <p className="qf-pill">☕ {heroContent.pill}</p>
            <h1>
              {heroContent.headline[0] || defaultHero.headline[0]}
              <br />
              <span>{heroContent.headline[1] || defaultHero.headline[1]}</span>
              <br />
              {heroContent.headline[2] || defaultHero.headline[2]}
            </h1>
            <p className="qf-hero-subtext">
              {heroContent.subtext}
            </p>

            <div className="qf-hero-ctas">
              <Link to="/menu-order" className="qf-btn qf-btn-filled">
                Order Now
              </Link>
              <Link to="/reservations" className="qf-btn qf-btn-outline">
                Reserve a Table
              </Link>
            </div>

            <div className="qf-stats">
              <span>7 Outlets</span>
              <span>Single Origin</span>
              <span>4.8 Rating</span>
              <span>4500ft Grown</span>
            </div>
          </div>

          <div className="qf-hero-right">
            <img
              src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80"
              alt="Qaffeine coffee"
            />
            <aside className="qf-float-card">
              <p>{heroContent.special_title}</p>
              <h3>{heroContent.special_item}</h3>
              <span>{heroContent.special_note}</span>
            </aside>
          </div>
        </section>

        <section className="qf-categories" aria-label="Category Strip">
          <div className="qf-pills-track">
            {categories.map((cat) => (
              <span key={cat} className="qf-pill-item">
                {cat}
              </span>
            ))}
          </div>
        </section>

        <section className="qf-best" id="menu-order">
          <div className="qf-section-head">
            <h2>Most Loved at Qaffeine</h2>
            <p>
              Signature beverages and comfort bites our guests keep returning for. Curated to pair beautifully with every mood and every table.
            </p>
          </div>

          <div className="qf-best-grid">
            {bestSellers.map((item) => (
              <article
                key={item.name}
                className="qf-best-card"
                role="button"
                tabIndex={0}
                onClick={() => goToBestSeller(item.name)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    goToBestSeller(item.name)
                  }
                }}
              >
                <div className="qf-best-image-wrap">
                  <img src={item.image} alt={item.name} />
                  <span className="qf-ribbon">Best Seller</span>
                  {item.isVeg ? <span className="qf-veg-dot" title="Veg item" /> : null}
                </div>

                <div className="qf-best-body">
                  <h3>{item.name}</h3>
                  <p>{item.desc}</p>
                  <div className="qf-best-foot">
                    <span className="qf-rating">
                      <Star size={14} /> {item.rating}
                    </span>
                    <span className="qf-best-open-hint">Open in Menu</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="qf-order-details" id="order-details">
          <div className="qf-section-head">
            <h2>Order Operations Timeline</h2>
            <p>A production-ready flow from order initiation to service completion.</p>
            <div className="qf-details-actions">
              <Link to="/order-details" className="qf-btn qf-btn-outline">
                <Coffee size={15} /> Open Details
              </Link>
            </div>
          </div>

          <div className="qf-flow-chart" aria-label="Order flow chart">
            {orderFlowSteps.map((step, index) => (
              <article key={step.title} className={`qf-flow-card ${step.tone}`}>
                <span className="qf-flow-index">{String(index + 1).padStart(2, '0')}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
                <span className="qf-flow-orb" aria-hidden="true" />
              </article>
            ))}
          </div>
        </section>

        <section className="qf-why">
          <div className="qf-section-head">
            <h2>Brewed Once. Loved Twice.</h2>
            <p>
              The Qaffeine philosophy is simple: source better, roast better, serve better.
            </p>
          </div>
          <div className="qf-why-grid">
            {whyCards.map((row) => (
              <article key={row.title}>
                <h3>{row.title}</h3>
                <p>{row.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="qf-story">
          {storyBlocks.map((block, index) => (
            <article key={block.title} className={`qf-story-row ${index % 2 === 1 ? 'reverse' : ''}`}>
              <img src={block.image} alt={block.title} />
              <div>
                <h2>{block.title}</h2>
                <p>{block.text}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="qf-reservation" id="reservations">
          <div>
            <CalendarDays size={20} />
            <h2>Reservations that feel effortless</h2>
            <p>
              Reserve your table with preferred slot and party size, and arrive to a setup that is already waiting for you.
            </p>
          </div>
          <a href="#outlets" className="qf-btn qf-btn-filled">
            View Available Outlets <ArrowRight size={15} />
          </a>
        </section>

        <section className="qf-outlets" id="outlets">
          <div className="qf-section-head">
            <h2>Find Us in Hyderabad</h2>
            <p>Choose your nearest Qaffeine and start your order instantly.</p>
          </div>

          <div className="qf-outlets-grid">
            {outlets.map((branch) => (
              <article key={branch.id || branch.name} className="qf-outlet-card">
                <div className="qf-outlet-top">
                  <h3>{branch.name}</h3>
                  <span className={branch.is_open ? 'open' : 'closed'}>
                    {branch.is_open ? 'Open Now' : 'Closed'}
                  </span>
                </div>
                <p>{branch.address}</p>
                <div className="qf-outlet-actions">
                  <a href={branch.google_maps_url} target="_blank" rel="noreferrer">
                    <MapPin size={14} /> Get Directions
                  </a>
                  <Link to="/login">
                    <Coffee size={14} /> Order from here
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="qf-instagram" id="instagram">
          <div className="qf-section-head">
            <h2>@Qaffeine_official</h2>
            <p>Daily brews, happy tables, and behind-the-counter stories.</p>
          </div>
          <div className="qf-insta-grid">
            {instagramImages.map((item) => (
              <img key={item.id} src={item.src} alt="Qaffeine instagram style" />
            ))}
          </div>
          <a className="qf-follow-btn" href="https://www.instagram.com/qaffeineofficial/" target="_blank" rel="noreferrer">
            Follow us
          </a>
        </section>

        <section className="qf-reviews" aria-label="Customer Reviews">
          <div className="qf-section-head">
            <h2>Customer Love, Brewed Daily</h2>
            <p>Fresh words from guests who keep coming back for the craft, comfort, and caffeine kick.</p>
          </div>

          <div className="qf-marquee-wrap">
            <div className="qf-marquee-track" style={{ animationDuration: `${Math.max(14, marqueeReviews.length * 2.1)}s` }}>
              {[...marqueeReviews, ...marqueeReviews].map((item, index) => (
                <article key={`${item.name}-${index}`} className="qf-review-card">
                  <div className="qf-review-head">
                    <strong>{item.name}</strong>
                    <span>{'★'.repeat(Math.max(1, Math.min(5, Number(item.rating || 5))))}</span>
                  </div>
                  <p>{item.review}</p>
                  <small>{item.source}</small>
                </article>
              ))}
            </div>
          </div>
        </section>

      </main>

      <footer className="qf-footer">
        <div className="qf-footer-grid">
          <section>
            <a href="#home" className="qf-logo">
              <BeanIcon />
              <span>Qaffeine</span>
            </a>
            <p>
              Single-origin coffee, adventurous beverages, and food that complements every cup.
            </p>
            <div className="qf-socials">
              <a href="https://www.instagram.com/qaffeineofficial/" target="_blank" rel="noreferrer" aria-label="Instagram">
                <InstagramGlyph />
              </a>
              <a href="https://www.facebook.com/qaffeineofficial/" target="_blank" rel="noreferrer" aria-label="Facebook">
                <FacebookGlyph />
              </a>
            </div>
          </section>

          <section>
            <h4>Explore</h4>
            <a href="#home">Home</a>
            <a href="#menu-order">Menu &amp; Order</a>
            <Link to="/reservations">Reservations</Link>
            <Link to="/order-details">Order Details</Link>
            <Link to="/login">Login</Link>
          </section>

          <section>
            <h4>Outlets</h4>
            {outlets.map((item) => (
              <a
                key={`footer-${item.id || item.name}`}
                href={item.google_maps_url}
                target="_blank"
                rel="noreferrer"
              >
                <MapPin size={13} /> {item.name}
              </a>
            ))}
          </section>

          <section>
            <h4>Contact</h4>
            <a href="tel:+916309397373">+91 63093 97373</a>
            <a href="https://www.instagram.com/qaffeineofficial/" target="_blank" rel="noreferrer">
              @Qaffeine_official
            </a>
            <p>Open across Hyderabad. Visit your nearest outlet for dine-in and takeaway.</p>
          </section>
        </div>

        <div className="qf-footer-bottom">
          <p>© 2025 Qaffeine. All rights reserved.</p>
          <a href="#">Privacy Policy</a>
          <a href="#">Terms</a>
        </div>
      </footer>
    </div>
  )
}
