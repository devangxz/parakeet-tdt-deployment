// `app/page.tsx` is the UI for the `/` URL
'use client'
import { usePathname } from 'next/navigation'
import { LegacyRef, useRef } from 'react'

const sidebarItems = [
  { link: '#intro', name: 'Introduction' },
  { link: '#spaces', name: 'Spaces' },
  { link: '#numbers', name: 'Numbers' },
  { link: '#plurals', name: 'Plurals' },
  { link: '#time-of-day', name: 'Time of day' },
  { link: '#capitalization', name: 'Capitalization' },
  { link: '#hyphenation', name: 'Hyphenation' },
  { link: '#names', name: 'Names' },
  { link: '#latin-abbreviations', name: 'Latin Abbreviations' },
]

const content = [
  {
    id: 'intro',
    Content: () => (
      <div id='intro'>
        <br />
        <div className='border-b pb-5 mb-5'>
          <h1 className='text-black font-semibold text-4xl'>
            <span className='font-semibold'>Style Guide</span>
          </h1>
          <br />
          <p className='text-slate-500'>
            This document specifies all the rules styles which apply to
            transcripts. Please{' '}
            <a
              href='/contact'
              target='_blank'
              className='text-blue-500 underline'
            >
              contact
            </a>{' '}
            support for questions or suggestions.
          </p>{' '}
          <br />
        </div>
      </div>
    ),
  },
  {
    id: 'spaces',
    Content: () => (
      <div className='pt-0' id='spaces'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Spaces</h3>
        </div>
        <br />
        <p className='text-slate-500'>Do not type spaces:</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>following a period with an abbreviation.</li>
          <li>following a period used as a decimal point.</li>
          <li>between quotation marks and the quoted material.</li>
          <li>before or after a hyphen.</li>
          <li>before or after a slash.</li>
          <li>before or after a dash.</li>
          <li>between a number and percent sign.</li>
          <li>between parentheses and the enclosed material.</li>
          <li>between any word and the punctuation following it.</li>
          <li>
            between the number and the colon used to indicate a dilute solution
            or ratio.
          </li>
          <li>on either side of the colon when expressing the time of day.</li>
          <li>before an apostrophe.</li>
          <li>before or after a comma used within numbers.</li>
          <li>
            before or after an ampersand in abbreviations, e.g.,{' '}
            <code>R&amp;D</code>.
          </li>
          <li>
            on either side of the colon when expressing ratios, e.g.{' '}
            <code>1:1</code>.
          </li>
          <li>
            after the closing parenthesis if another mark of punctuation
            follows.
          </li>
        </ul>
        <br />
        <p className='text-slate-500'>Type one space</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>between words</li>
          <li>after a comma</li>
          <li>after a colon</li>
          <li>after a semicolon</li>
          <li>after a period following an initial</li>
          <li>after the closing parenthesis</li>
          <li>
            on each side of the x in an expression of dimension, e.g., 4 x 4
          </li>
        </ul>
        <br />
      </div>
    ),
  },
  {
    id: 'numbers',
    Content: () => (
      <div className='pt-0' id='numbers'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Numbers</h3>
        </div>
        <p className='text-slate-500'>Do not type spaces:</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            Spell out whole numbers zero through nine, use numerals for 10 and
            above.
          </li>
          <li>
            Use numerals when numbers are directly used with symbols, e.g.,
            $100.
          </li>
          <li>
            Use numerals when expressing ages, e.g., 7-year-old child, 3 years
            old.
          </li>
          <li>
            Use numerals for everything metric, centimeters, millimeters,
            liters, etc., e.g., 4 cm.
          </li>
          <li>
            Spell out and hyphenate fractions standing alone, e.g., He drank
            one-half a gallon of apple juice.
          </li>
          <li>Use numerals to express mixed fractions, e.g., 1 1/2 years.</li>
          <li>
            Use commas only if there are 5 or more digits when expressing
            numbers, e.g., 10,000, 4000.
          </li>
          <li>
            Substitute a hyphen for the word &quot;to&quot;, e.g., He is to take 1-2
            tablets.
          </li>
          <li>
            Leave a space between numerals and measurements unless they form a
            compound modifier, e.g., It is 6 cm below the..., It is 1200 ml...,
            A 4-cm nevus..., A 2 x 2-mm lesion.
          </li>
          <li>
            Always use 0 in front of the decimal point if the number is not a
            whole number, e.g., 0.75 mg.
          </li>
          <li>Use decimal fractions with metric measurements, e.g., 1.5 cm.</li>
          <li>
            Use mixed fractions with English system measurements, e.g., 1 1/2
            inch.
          </li>
          <li>
            Do not start a sentence using a number. Spell out the number or
            recast the sentence.
          </li>
        </ul>
        <br />
      </div>
    ),
  },
  {
    id: 'plurals',
    Content: () => (
      <div className='pt-0' id='plurals'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Plurals</h3>
        </div>
        <p className='text-slate-500'>Do not type spaces:</p>
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            Use apostrophe s (&apos;s) to form the plural of single letters, symbols,
            and numerals, e.g., p&apos;s, Q&apos;s, 4 x 4&apos;s, serial 7&apos;s, 6&apos;s and 7&apos;s.
          </li>
          <li>
            Add s without apostrophe to form the plural of multiple-digit
            numbers including years, e.g., 500s, 20s, 1940s.
          </li>
          <li>
            Use apostrophe s (&apos;s) to form the plural of lowercase abbreviations,
            but no apostrophe following all-capital abbreviations, e.g., rbc&apos;s,
            WBCs, PVCs.
          </li>
          <li>
            When referring to a single year without the century, precede it by
            an apostrophe, e.g., &apos;99.
          </li>
          <li>
            Use a preceding apostrophe in shortened numeric expressions relating
            to decades of the century (&apos;90s) but omit the preceding apostrophe
            in expressions relating to decades of age (80s), e.g., in the &apos;70s,
            in his 50s.
          </li>
          <li>Add s to form the numeric plural, e.g., 1990s.</li>
        </ul>
        <br />
      </div>
    ),
  },
  {
    id: 'time-of-day',
    Content: () => (
      <div className='pt-0' id='time-of-day'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Time of the day</h3>
        </div>
        <p className='text-slate-500'>Do not type spaces:</p>
        <ul className='list-disc pl-5 text-slate-500'>
          <li>8:30 AM</li>
          <li>8:30 PM</li>
          <li>or 12 o&apos;clock</li>
        </ul>
        <br />
      </div>
    ),
  },
  {
    id: 'capitalization',
    Content: () => (
      <div className='pt-0' id='capitalization'>
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Capitalization</h3>
        </div>
        <p className='text-slate-500'>Capitalize:</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>Abbreviations when the words they represent are capitalized.</li>
          <li>
            The first word following a colon if it begins a complete sentence or
            is part of an outline entry.
          </li>
          <li>Most abbreviations of English words.</li>
          <li>The first letter of chemical elements.</li>
          <li>
            The names of the days of the week, months, holidays, historic events
            and religious festivals.
          </li>
          <li>
            The names of specific departments or sections in the institution
            only when the institution name is included.
          </li>
          <li>
            The names of diseases that include proper nouns, eponyms or genus
            names.
          </li>
          <li>The trade or brand names of drugs.</li>
          <li>A quote when it is a complete sentence.</li>
          <li>
            The names of races, peoples, religions and languages. Black, as a
            race designation would be capitalized, however client preferences
            may differ.
          </li>
          <li>
            The first word of a direct question even if the question is not
            placed within quotation marks, e.g., She refused to answer the
            question, What is your name?.
          </li>
          <li>
            The proper names of monotheistic deities: God, Allah, the Father,
            the Son, Jesus Christ, the Son of God, the Redeemer, the Holy
            Spirit, etc.
          </li>
          <li>
            The proper names of pagan and mythological gods and goddesses:
            Neptune, Thor, Venus, etc.
          </li>
          <li>
            The word Bible when referring to the Scriptures in the Old Testament
            or the New Testament.
          </li>
          <li>
            The word Gospel when referring to any or all of the first four books
            of the New Testament: the Gospel of St. John, the Gospels.
          </li>
          <li>
            The words Scriptures, the Holy Scriptures and other related words.
          </li>
          <li>The words Hades and Satan.</li>
        </ul>
        <br />
        <p className='text-slate-500'>Do not capitalize:</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>The spelled out names of the chemical elements.</li>
          <li>The seasons of the year.</li>
          <li>The common names of diseases and animals.</li>
          <li>The names of viruses unless they include a proper noun.</li>
          <li>Generic drug names.</li>
          <li>
            The common noun following the brand name, e.g., tylenol tablets.
          </li>
          <li>The names of medical or surgical specialties.</li>
          <li>Designations based on skin color, e.g., a tall white man.</li>
          <li>
            Pronouns referring to a deity: he, him, his, thee, thou, who, whose,
            thy, etc.
          </li>
          <li>Gods in referring to the deities of polytheistic religions.</li>
          <li>
            Words such as god-awful, goddamn, godlike, godliness, godsend.
          </li>
          <li>The word biblical.</li>
          <li>
            The word bible when used in a nonreligious term, e.g., My dictionary
            is my bible.
          </li>
          <li>
            The word Gospel when used other references other than the first four
            books of the New Testament, e.g., She is a famous gospel singer.
          </li>
          <li>
            The following words: heaven, hell, devil, angel, cherub, an apostle,
            a priest.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: 'hyphenation',
    Content: () => (
      <div className='pt-0' id='hyphenation'>
        <br />
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Hyphenation</h3>
        </div>
        <p className='text-slate-500'>
          The following prefixes do not require the use of a connecting hyphen
          in compound terms:
        </p>
        <br />

        <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
          <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
            <tr>
              <th className='py-3 px-6 text-left'></th>
              <th className='py-3 px-6 text-left'></th>
              <th className='py-3 px-6 text-left'></th>
              <th className='py-3 px-6 text-left'></th>
              <th className='py-3 px-6 text-left'></th>
            </tr>
          </thead>
          <tbody className='text-gray-600 text-sm font-light'>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left whitespace-nowrap'>ante</td>
              <td className='py-3 px-6 text-left'>anti</td>
              <td className='py-3 px-6 text-left'>bi</td>
              <td className='py-3 px-6 text-left'>co</td>
              <td className='py-3 px-6 text-left'>contra</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left whitespace-nowrap'>de</td>
              <td className='py-3 px-6 text-left'>extra</td>
              <td className='py-3 px-6 text-left'>infra</td>
              <td className='py-3 px-6 text-left'>inter</td>
              <td className='py-3 px-6 text-left'>intra</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left whitespace-nowrap'>mid</td>
              <td className='py-3 px-6 text-left'>non</td>
              <td className='py-3 px-6 text-left'>over</td>
              <td className='py-3 px-6 text-left'>pre</td>
              <td className='py-3 px-6 text-left'>post</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left whitespace-nowrap'>pseudo</td>
              <td className='py-3 px-6 text-left'>re</td>
              <td className='py-3 px-6 text-left'>semi</td>
              <td className='py-3 px-6 text-left'>sub</td>
              <td className='py-3 px-6 text-left'>super</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left whitespace-nowrap'>trans</td>
              <td className='py-3 px-6 text-left'>tri</td>
              <td className='py-3 px-6 text-left'>ultra</td>
              <td className='py-3 px-6 text-left'>un</td>
              <td className='py-3 px-6 text-left'>under</td>
            </tr>
          </tbody>
        </table>
        <br />
        <p className='text-slate-500'>Also:</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>
            Correct: antithesis, counterproductive, interpersonal, nonspecific,
            overestimate
          </li>
          <li>
            Do use a hyphen with prefixes ending in a or i and a base word
            beginning with the same letter, e.g. anti-inflammatory.
          </li>
          <li>
            Do use a hyphen when compounded with the prefix self, e.g.,
            self-administered, self-monitored.
          </li>
          <li>
            For clarification, use a hyphen after a prefix if not using a hyphen
            would change the meaning of the word, e.g., re-cover (to cover
            again) versus recover (regain).
          </li>
        </ul>
        <br />
      </div>
    ),
  },
  {
    id: 'names',
    Content: () => (
      <div className='pt-0' id='names'>
        <br />
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Names</h3>
        </div>
        <p className='text-slate-500'>
          The following prefixes do not require the use of a connecting hyphen
          in compound terms:
        </p>
        <br />
        <p className='text-slate-500'>Also:</p>
        <br />
        <ul className='list-disc pl-5 text-slate-500'>
          <li>Mr., Ms., Mrs., Miss, and Dr., should be abbreviated.</li>
          <li>
            Names with junior or senior attached. Use a comma before and a
            period after the abbreviation or use neither, e.g., Jeramiah
            Johnson, Jr. or Jeramiah Johnson Jr
          </li>
          <li>
            Names with ordinals. Do not use comma between name and ordinal, e.g.
            Bernie Schwartz III
          </li>
        </ul>
        <br />
      </div>
    ),
  },
  {
    id: 'latin-abbreviations',
    Content: () => (
      <div className='pt-0' id='latin-abbreviations'>
        <br />
        <div className='mb-3'>
          <h3 className='text-black text-xl'>Latin Abbreviations</h3>
        </div>
        <p className='text-slate-500'>
          Use periods within and at the end of the following Latin
          abbreviations, followed by a comma.
        </p>
        <br />
        <p className='text-slate-500'>Also:</p>
        <br />
        <table className='min-w-full bg-white shadow-md rounded-lg overflow-hidden'>
          <thead className='bg-gray-200 text-gray-600 uppercase text-sm leading-normal'>
            <tr>
              <th className='py-3 px-6 text-left'>Abbreviation</th>
              <th className='py-3 px-6 text-left'>Latin</th>
              <th className='py-3 px-6 text-left'>English</th>
            </tr>
          </thead>
          <tbody className='text-gray-600 text-sm font-light'>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>e.g.</td>
              <td className='py-3 px-6 text-left'>exempli gratia</td>
              <td className='py-3 px-6 text-left'>for example</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>et al.</td>
              <td className='py-3 px-6 text-left'>et alii</td>
              <td className='py-3 px-6 text-left'>and others</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>etc.</td>
              <td className='py-3 px-6 text-left'>et cetera or etcetera</td>
              <td className='py-3 px-6 text-left'>and so forth</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>i.e.</td>
              <td className='py-3 px-6 text-left'>id est</td>
              <td className='py-3 px-6 text-left'>that is</td>
            </tr>
            <tr className='border-b border-gray-200 hover:bg-gray-100'>
              <td className='py-3 px-6 text-left'>viz.</td>
              <td className='py-3 px-6 text-left'>videlicet</td>
              <td className='py-3 px-6 text-left'>that is, namely</td>
            </tr>
          </tbody>
        </table>
        <br />
      </div>
    ),
  },
]

export default function Page() {
  const pathname = usePathname()
  const rightSidebarRef = useRef<HTMLElement | null>(null) // Create a ref for the right sidebar

  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    const targetId = event.currentTarget.getAttribute('href')?.slice(1)
    const targetElement = targetId ? document.getElementById(targetId) : null
    if (targetElement && rightSidebarRef.current) {
      const topPos = targetElement.offsetTop - rightSidebarRef.current.offsetTop
      rightSidebarRef.current.scrollTo({
        top: topPos,
        behavior: 'smooth',
      })
    }
  }
  return (
    <div className='flex gap-8 w-[80%] h-screen mx-[10%] m-auto relative'>
      {/* Adjust the sidebar container styles */}
      <div className='h-[100%] flex lg:flex-col space-x-0 space-y-1 min-w-[20%] absolute left-0 top-0 z-1 overflow-y-auto overscroll-y-scroll no-scrollbar'>
        {sidebarItems.map((item, index) => {
          const isActive = pathname === `${item.link}${content[index]?.id}`
          return (
            <a
              key={item.link}
              href={item.link}
              onClick={scrollToSection}
              className={`flex items-center gap-2.5 rounded-lg py-2 transition-all ${
                isActive ? 'text-primary bg-primary/10' : 'hover:text-primary'
              }`}
            >
              {item.name}
            </a>
          )
        })}
      </div>

      {/* Main content container (unchanged) */}
      <div
        ref={rightSidebarRef as LegacyRef<HTMLDivElement> | undefined}
        className='h-[100%] flex space-x-2 lg:flex-col lg:space-x-0 font-medium overflow-auto w-[80%] absolute top-0 right-0  overflow-y-auto overscroll-y-contain no-scrollbar'
      >
        {content.map((item, index) => {
          const Content = item.Content
          return (
            <div key={index}>
              <Content />
            </div>
          )
        })}
      </div>
    </div>
  )
}
