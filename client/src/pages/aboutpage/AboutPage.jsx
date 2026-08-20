import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sparkles, 
  BookOpen, 
  PenTool, 
  Users, 
  ThumbsUp, 
  Award, 
  Bot, 
  ArrowRight, 
  CheckCircle2, 
  Code2, 
  Database, 
  Cpu, 
  ShieldCheck, 
  Compass,
  Rocket
} from 'lucide-react';
import './AboutPage.css';

const AboutPage = ({ collapsed }) => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: "01",
      title: "Create",
      desc: "Start with an idea, a world, a character, or simply a sentence that sets the stage."
    },
    {
      num: "02",
      title: "Publish",
      desc: "Turn your idea into a story or song and share it with the growing StoryWeave community."
    },
    {
      num: "03",
      title: "Discover",
      desc: "Readers explore stories across genres, upvote their favorite continuations, and follow creators."
    },
    {
      num: "04",
      title: "Contribute",
      desc: "Readers can submit their own continuation, plot twist, or creative direction to existing works."
    },
    {
      num: "05",
      title: "Collaborate",
      desc: "Original authors review community contributions and choose which pieces belong in their official story."
    },
    {
      num: "06",
      title: "Evolve",
      desc: "Accepted contributions merge into the main text, creating an evolving story with multi-author recognition."
    }
  ];

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`about-page ${collapsed ? 'collapsed' : ''}`}>
      
      {/* ── 1. HERO SECTION ── */}
      <section className="about-hero">
        <div className="about-hero-badge">
          <Sparkles size={14} />
          <span>The Collaborative Storytelling Platform</span>
        </div>
        
        <h1 className="about-hero-title">
          STORYWEAVE
        </h1>
        
        <p className="about-hero-tagline">
          &ldquo;Where stories don't end. They evolve.&rdquo;
        </p>

        <p className="about-hero-description">
          StoryWeave is a collaborative storytelling platform where one person's single voice can become a community's shared creation.
        </p>

        <div className="about-hero-actions">
          <button className="about-btn primary" onClick={() => navigate('/')}>
            <span>Start Exploring</span>
            <ArrowRight size={16} />
          </button>
          <button className="about-btn secondary" onClick={() => scrollToSection('idea')}>
            <span>Discover How It Works</span>
            <Compass size={16} />
          </button>
        </div>

        {/* Interactive Story Branching Visual */}
        <div className="about-hero-branch-visual">
          <div className="branch-root-node">
            <span className="node-dot" />
            <span className="node-label">One Idea</span>
          </div>
          <div className="branch-connecting-lines">
            <div className="line line-1" />
            <div className="line line-2" />
            <div className="line line-3" />
            <div className="line line-4" />
          </div>
          <div className="branch-leaf-nodes">
            <div className="leaf-node"><BookOpen size={14} /> <span>Stories</span></div>
            <div className="leaf-node"><Users size={14} /> <span>Readers</span></div>
            <div className="leaf-node"><Sparkles size={14} /> <span>Contributors</span></div>
            <div className="leaf-node"><PenTool size={14} /> <span>Authors</span></div>
          </div>
        </div>
      </section>

      {/* ── 2. THE IDEA SECTION ── */}
      <section id="idea" className="about-section idea-section">
        <div className="section-header">
          <span className="section-pill">The Vision</span>
          <h2 className="section-title">Every Story Has Another Chapter</h2>
          <p className="section-subtitle">
            Traditional storytelling usually ends with the author's final period. StoryWeave transforms reading into an active conversation.
          </p>
        </div>

        {/* Visual Story Flow */}
        <div className="idea-flow-container">
          <div className="flow-step-card">
            <div className="flow-icon"><PenTool size={22} /></div>
            <h4>Author</h4>
            <p>Creates the opening world & premise</p>
          </div>
          <div className="flow-arrow">➔</div>

          <div className="flow-step-card">
            <div className="flow-icon"><BookOpen size={22} /></div>
            <h4>Story</h4>
            <p>Published for the community</p>
          </div>
          <div className="flow-arrow">➔</div>

          <div className="flow-step-card">
            <div className="flow-icon"><Users size={22} /></div>
            <h4>Readers</h4>
            <p>Experience and engage</p>
          </div>
          <div className="flow-arrow">➔</div>

          <div className="flow-step-card">
            <div className="flow-icon"><Sparkles size={22} /></div>
            <h4>Contributions</h4>
            <p>Community submits continuations</p>
          </div>
          <div className="flow-arrow">➔</div>

          <div className="flow-step-card highlight">
            <div className="flow-icon"><Award size={22} /></div>
            <h4>Accepted</h4>
            <p>Author merges top continuations</p>
          </div>
          <div className="flow-arrow">➔</div>

          <div className="flow-step-card final">
            <div className="flow-icon"><Rocket size={22} /></div>
            <h4>Evolving Story</h4>
            <p>A living work of shared imagination</p>
          </div>
        </div>
      </section>

      {/* ── 3. HOW IT WORKS TIMELINE ── */}
      <section className="about-section timeline-section">
        <div className="section-header">
          <span className="section-pill">The Process</span>
          <h2 className="section-title">From Thought to Story</h2>
          <p className="section-subtitle">Six simple steps that power collaborative creation on StoryWeave.</p>
        </div>

        <div className="timeline-grid">
          {steps.map((step, idx) => (
            <div 
              key={step.num}
              className={`timeline-card ${activeStep === idx ? 'active' : ''}`}
              onMouseEnter={() => setActiveStep(idx)}
            >
              <div className="timeline-number">{step.num}</div>
              <h3 className="timeline-title">{step.title}</h3>
              <p className="timeline-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. WHAT MAKES STORYWEAVE DIFFERENT ── */}
      <section className="about-section features-section">
        <div className="section-header">
          <span className="section-pill">Platform Capabilities</span>
          <h2 className="section-title">Not Just a Place to Read</h2>
          <p className="section-subtitle">Core features designed to elevate readers into active co-creators.</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon"><PenTool size={24} /></div>
            <h3>✍ Write</h3>
            <p>Write stories or song lyrics with rich block formatting, cover images, and genre tags.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Sparkles size={24} /></div>
            <h3>✨ Contribute</h3>
            <p>Continue ongoing stories by submitting proposed continuation paragraphs directly to authors.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><ThumbsUp size={24} /></div>
            <h3>⬆ Community Voting</h3>
            <p>Upvote the community continuations you believe deserve to be officially added to the story.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Award size={24} /></div>
            <h3>🏆 Recognition</h3>
            <p>Accepted contributors are permanently credited as co-authors on story cards and profile pages.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Users size={24} /></div>
            <h3>👥 Follow Creators</h3>
            <p>Follow your favorite authors to stay notified when they publish new chapters or accept contributions.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon"><Bot size={24} /></div>
            <h3>🤖 AI Story Companion</h3>
            <p>Utilize Gemini AI to analyze character arcs, find plot holes, get story ratings, and brainstorm ideas.</p>
          </div>
        </div>
      </section>

      {/* ── 5. CONTRIBUTION SHOWCASE ── */}
      <section className="about-section contribution-demo-section">
        <div className="section-header">
          <span className="section-pill">Interactive Demo</span>
          <h2 className="section-title">Your Voice Can Become Part of the Story</h2>
          <p className="section-subtitle">See how a community continuation transforms into an accepted story chapter.</p>
        </div>

        <div className="contribution-demo-card">
          <div className="demo-block author-block">
            <div className="demo-author-header">
              <span className="demo-role">ORIGINAL AUTHOR</span>
              <span className="demo-name">@Elena_Vance</span>
            </div>
            <p className="demo-text">&ldquo;The heavy oak door slowly opened with a low groan, revealing a shadowy hallway...&rdquo;</p>
          </div>

          <div className="demo-connector">
            <span>Community Continuation Submitted</span>
            <div className="connector-line" />
          </div>

          <div className="demo-block contrib-block">
            <div className="demo-author-header">
              <span className="demo-role contrib">CONTRIBUTOR</span>
              <span className="demo-name">@Marcus_Sky</span>
              <span className="demo-badge pending">Pending Author Review</span>
            </div>
            <p className="demo-text">&ldquo;Beyond it lay a glowing subterranean city that had been waiting three centuries for someone to return.&rdquo;</p>
          </div>

          <div className="demo-action-bar">
            <span className="demo-author-action">Author Action:</span>
            <span className="demo-badge accepted"><CheckCircle2 size={13} /> ✓ Added To Story</span>
          </div>

          <div className="demo-result-card">
            <div className="result-header">
              <h4>🎉 Story Evolved!</h4>
              <span className="result-credits">Credits: Elena Vance (Author) • Marcus Sky (Contributor 🏆)</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6. COMMUNITY CONNECTIONS ── */}
      <section className="about-section community-section">
        <div className="section-header">
          <span className="section-pill">Ecosystem</span>
          <h2 className="section-title">A Story Is Bigger Than Its Author</h2>
          <p className="section-subtitle">Connecting writers, readers, and contributors in one seamless weave.</p>
        </div>

        <div className="community-nodes-container">
          <div className="node-center">
            <Sparkles size={28} />
            <span>STORYWEAVE</span>
          </div>

          <div className="node-orbit orbit-1">
            <div className="node-item top"><PenTool size={16} /> <span>AUTHORS</span></div>
            <div className="node-item right"><BookOpen size={16} /> <span>STORIES</span></div>
            <div className="node-item bottom"><Sparkles size={16} /> <span>CONTRIBUTORS</span></div>
            <div className="node-item left"><Users size={16} /> <span>READERS</span></div>
          </div>
        </div>
      </section>

      {/* ── 7. AI COMPANION SECTION ── */}
      <section className="about-section ai-section">
        <div className="section-header">
          <span className="section-pill">AI Assistance</span>
          <h2 className="section-title">Your Story Has an AI Companion</h2>
          <p className="section-subtitle">
            &ldquo;AI doesn't write your story for you. It helps you see your story from another perspective.&rdquo;
          </p>
        </div>

        <div className="ai-capabilities-grid">
          <div className="ai-cap-pill">📝 Story Summaries</div>
          <div className="ai-cap-pill">⭐ Story & Lyrics Ratings</div>
          <div className="ai-cap-pill">🦸 Hero Character Analysis</div>
          <div className="ai-cap-pill">🎭 Deep Character Breakdown</div>
          <div className="ai-cap-pill">🔍 Plot Hole Detection</div>
          <div className="ai-cap-pill">💡 Story Improvement Tips</div>
          <div className="ai-cap-pill">📖 Next Chapter Brainstorming</div>
          <div className="ai-cap-pill">🌍 Multi-Language Translation</div>
          <div className="ai-cap-pill">💬 General Creative Discussion</div>
        </div>
      </section>

      {/* ── 8. TECH STACK SECTION ── */}
      <section className="about-section tech-section">
        <div className="section-header">
          <span className="section-pill">Architecture</span>
          <h2 className="section-title">Behind the Weave</h2>
          <p className="section-subtitle">Built on modern, high-performance web technologies.</p>
        </div>

        <div className="tech-stack-grid">
          <div className="tech-card">
            <div className="tech-header"><Code2 size={20} /> <span>Frontend</span></div>
            <div className="tech-tags">
              <span className="tech-tag">React</span>
              <span className="tech-tag">JavaScript (ES6+)</span>
              <span className="tech-tag">Vite</span>
              <span className="tech-tag">Vanilla CSS</span>
              <span className="tech-tag">React Router DOM</span>
            </div>
          </div>

          <div className="tech-card">
            <div className="tech-header"><Cpu size={20} /> <span>Backend</span></div>
            <div className="tech-tags">
              <span className="tech-tag">Node.js</span>
              <span className="tech-tag">Express.js</span>
              <span className="tech-tag">REST APIs</span>
            </div>
          </div>

          <div className="tech-card">
            <div className="tech-header"><Database size={20} /> <span>Database & Storage</span></div>
            <div className="tech-tags">
              <span className="tech-tag">MongoDB</span>
              <span className="tech-tag">Mongoose ODM</span>
              <span className="tech-tag">Cloudinary CDN</span>
            </div>
          </div>

          <div className="tech-card">
            <div className="tech-header"><ShieldCheck size={20} /> <span>AI & Security</span></div>
            <div className="tech-tags">
              <span className="tech-tag">Google Gemini API (@google/genai)</span>
              <span className="tech-tag">JWT Authentication</span>
              <span className="tech-tag">Bcrypt Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── 9. PROJECT JOURNEY ── */}
      <section className="about-section journey-section">
        <div className="section-header">
          <span className="section-pill">Evolution</span>
          <h2 className="section-title">Built to Become More</h2>
          <p className="section-subtitle">Our journey of continuous improvement and feature development.</p>
        </div>

        <div className="journey-columns">
          <div className="journey-col today">
            <h3>AVAILABLE TODAY</h3>
            <ul>
              <li><CheckCircle2 size={16} /> Collaborative stories & song lyrics</li>
              <li><CheckCircle2 size={16} /> Community continuations & upvoting</li>
              <li><CheckCircle2 size={16} /> Original author moderation controls</li>
              <li><CheckCircle2 size={16} /> Author follow & reading history tracking</li>
              <li><CheckCircle2 size={16} /> Full 9-action Gemini AI Assistant</li>
              <li><CheckCircle2 size={16} /> Responsive dark & light themes</li>
            </ul>
          </div>

          <div className="journey-col next">
            <h3>COMING NEXT</h3>
            <ul>
              <li><Sparkles size={16} /> Smarter story analysis & recommendations</li>
              <li><Sparkles size={16} /> Co-author real-time notification alerts</li>
              <li><Sparkles size={16} /> Expanded creator analytics dashboard</li>
              <li><Sparkles size={16} /> Advanced AI drafting companions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── 10. CLOSING CTA SECTION ── */}
      <section className="about-cta">
        <h2 className="cta-heading">&ldquo;Stories were never meant to live in isolation.&rdquo;</h2>
        <p className="cta-subheading">Write one. Share one. Continue one. Become part of one.</p>
        
        <div className="cta-actions">
          <button className="about-btn primary" onClick={() => navigate('/')}>
            <span>Explore Stories</span>
            <ArrowRight size={16} />
          </button>
          <button className="about-btn secondary" onClick={() => navigate('/post')}>
            <span>Create Your Story</span>
            <PenTool size={16} />
          </button>
        </div>
      </section>

    </div>
  );
};

export default AboutPage;
