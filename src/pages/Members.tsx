import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useMode } from '../contexts/ModeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { memberService, Member, MemberLink as DBLink } from '../services/memberService';
import * as d3 from 'd3';

type MemberNode = d3.SimulationNodeDatum & Member;

type MemberLink = d3.SimulationLinkDatum<MemberNode> & {
  id: string;
  source: string | MemberNode;
  target: string | MemberNode;
  type: string;
};

const ROLE_COLORS = {
  'Pastor': '#8B7E74',
  'Leader': '#C7BCA1',
  'Member': '#2D5BFF',
  'New Friend': '#10B981'
};

const SKILLS_LIST = [
  'Sunday School Teacher', 'Worship', 'Lead Singer', 'Backing Vocal', 'Usher', 
  'Giving', 'Assistant Teacher', 'Kitchen', 'Cleaning', 'Preaching', 'IT', 'Musician', 'Custom'
];

const INDUSTRIES = [
  'industryEducation',
  'industryHealthcare',
  'industryIT',
  'industryFinance',
  'industryBusiness',
  'industryGov',
  'industryArts',
  'industryConstruction',
  'industryRetired',
  'industryLooking'
];

export default function Members() {
  const { mode } = useMode();
  const { t } = useLanguage();
  const { church } = useAuth();
  const [nodes, setNodes] = useState<MemberNode[]>([]);
  const [links, setLinks] = useState<MemberLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<MemberNode | null>(null);

  useEffect(() => {
    if (!church?.id) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [dbMembers, dbLinks] = await Promise.all([
          memberService.getMembers(church.id),
          memberService.getMemberLinks(church.id)
        ]);

        if (dbMembers.length === 0) {
          // If no members in DB yet, we could seed with defaultNodes but map them to church_id
          // For now, let's just use an empty state or the user can add them.
          // setNodes(defaultNodes as any); 
        } else {
          setNodes(dbMembers as any);
        }
        
        setLinks(dbLinks.map(l => ({
          id: l.id,
          source: l.source_id,
          target: l.target_id,
          type: l.type
        })) as any);

      } catch (error) {
        console.error('Error fetching members:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [church?.id]);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close profile panel on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setSelectedNode(null);
      }
    }
    if (selectedNode) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedNode]);
  const [viewMode, setViewMode] = useState<'Graph' | 'List'>('Graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [occupationFilter, setOccupationFilter] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberNode | null>(null);
  const [referralSearch, setReferralSearch] = useState('');
  const [showReferralDropdown, setShowReferralDropdown] = useState(false);
  const referralRef = useRef<HTMLDivElement>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [showGraphInstructions, setShowGraphInstructions] = useState(true);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (referralRef.current && !referralRef.current.contains(event.target as Node)) {
        setShowReferralDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filters
  const filteredNodeIds = useMemo(() => {
    return new Set(nodes.filter(node => {
      const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          node.role.some(r => r.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          node.skills?.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesOccupation = occupationFilter ? node.occupation === occupationFilter : true;
      const matchesGroup = groupFilter ? node.family === groupFilter : true;
      const matchesSkill = skillFilter ? node.skills?.includes(skillFilter) : true;
      return matchesSearch && matchesOccupation && matchesGroup && matchesSkill;
    }).map(n => n.id));
  }, [nodes, searchQuery, occupationFilter, groupFilter, skillFilter]);

  // D3 Visualization logic
  useEffect(() => {
    if (!svgRef.current || viewMode !== 'Graph') return;

    const width = containerRef.current?.clientWidth || 800;
    const height = containerRef.current?.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    const simulation = d3.forceSimulation<MemberNode>(nodes)
      .force("link", d3.forceLink<MemberNode, MemberLink>(links).id(d => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-1000))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(80));

    const link = g.append("g")
      .attr("class", "links")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6)
      .attr("marker-end", "url(#arrowhead)");

    const nodeState = g.append("g")
      .attr("class", "nodes")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node-group")
      .style("cursor", "pointer")
      .on("click", (_event, d: MemberNode) => {
        setSelectedNode(d);
      })
      .call(d3.drag<SVGGElement, MemberNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    nodeState.append("rect")
      .attr("width", 60)
      .attr("height", 60)
      .attr("x", -30)
      .attr("y", -30)
      .attr("rx", 16)
      .attr("fill", "#ffffff")
      .attr("stroke", (d: MemberNode) => ROLE_COLORS[d.status] || "#2D5BFF")
      .attr("stroke-width", 2)
      .attr("class", "node-bg shadow-sm");

    nodeState.append("text")
      .text((d: MemberNode) => d.initials)
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("font-size", "14px")
      .attr("font-weight", "black")
      .attr("fill", (d: MemberNode) => ROLE_COLORS[d.status] || "#2D5BFF");

    nodeState.append("text")
      .text((d: MemberNode) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", "45")
      .attr("font-size", "10px")
      .attr("font-weight", "bold")
      .attr("class", "node-label")
      .attr("fill", "#111827");

    nodeState.append("text")
      .text((d: MemberNode) => d.status)
      .attr("text-anchor", "middle")
      .attr("dy", "58")
      .attr("font-size", "8px")
      .attr("font-weight", "black")
      .attr("letter-spacing", "0.1em")
      .attr("fill", (d: MemberNode) => ROLE_COLORS[d.status] || "#2D5BFF")
      .attr("class", "uppercase opacity-70");

    svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 35)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-5L10,0L0,5")
      .attr("fill", "#e5e7eb");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      nodeState
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
      
      nodeState.style("opacity", (d: any) => filteredNodeIds.has(d.id) ? 1 : 0.1)
          .style("filter", (d: any) => filteredNodeIds.has(d.id) ? "none" : "grayscale(1) blur(1px)");
      link.style("opacity", (d: any) => filteredNodeIds.has(d.source.id) && filteredNodeIds.has(d.target.id) ? 0.6 : 0.05);

      nodeState.select(".node-bg")
          .attr("stroke-width", (d: any) => selectedNode?.id === d.id ? 4 : 2)
          .attr("fill", (d: any) => selectedNode?.id === d.id ? (ROLE_COLORS[d.status as keyof typeof ROLE_COLORS] + '10') : "#ffffff");
    });

    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;

      if (mode === 'Manager') {
        const threshold = 50;
        nodes.forEach(targetNode => {
          if (targetNode.id !== d.id) {
            const dx = event.x - (targetNode.x || 0);
            const dy = event.y - (targetNode.y || 0);
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < threshold) {
              const linkExists = links.some(l => 
                ((l.source as any).id === d.id && (l.target as any).id === targetNode.id) ||
                ((l.source as any).id === targetNode.id && (l.target as any).id === d.id)
              );
              
              if (!linkExists) {
                const newLink: MemberLink = {
                  id: `l${Date.now()}`,
                  source: d.id,
                  target: targetNode.id,
                  type: 'Invited' 
                };
                setLinks(prev => [...prev, newLink]);
              }
            }
          }
        });
      }
    }

    return () => {
      simulation.stop();
    };
  }, [nodes, links, viewMode, selectedNode, filteredNodeIds, mode]);

  const allOccupations = Array.from(new Set(nodes.map(n => n.occupation).filter(Boolean)));
  const allGroups = Array.from(new Set(nodes.map(n => n.family).filter(Boolean)));
  
  const handleExport = () => {
    alert(t('exportSuccess'));
  };

  const [referrals, setReferrals] = useState<string[]>([]);
  const [skillsList, setSkillsList] = useState<string[]>(SKILLS_LIST);
  const [newTagInput, setNewTagInput] = useState('');

  const handleAddMember = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    let newMemberId = editingMember ? editingMember.id : Date.now().toString();

    // Check for custom tags on submit
    const currentSkills = formData.getAll('skills') as string[];
    
    if (editingMember) {
      const updates: Partial<Member> = {
        name,
        initials: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
        role: [formData.get('role') as string],
        occupation: formData.get('occupation') as string,
        family: formData.get('family') as string,
        status: formData.get('status') as any || 'Member',
        age: Number(formData.get('age')),
        dob: formData.get('dob') as string,
        referral_source: referrals.join(', '),
        friends_with: referrals.map(name => nodes.find(n => n.name === name)?.id).filter(Boolean) as string[],
        skills: currentSkills,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
      };

      memberService.updateMember(editingMember.id, updates).then(updated => {
        setNodes(prev => prev.map(n => n.id === updated.id ? { ...n, ...updated } : n));
      });
      setEditingMember(null);
    } else {
      const newMember: Omit<Member, 'id'> = {
        church_id: church.id,
        name,
        initials: name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2),
        role: [formData.get('role') as string],
        occupation: formData.get('occupation') as string,
        family: formData.get('family') as string,
        joined: new Date().getFullYear().toString(),
        status: formData.get('status') as any || 'Member',
        age: Number(formData.get('age')),
        dob: formData.get('dob') as string,
        referral_source: referrals.join(', '),
        friends_with: referrals.map(name => nodes.find(n => n.name === name)?.id).filter(Boolean) as string[],
        skills: currentSkills,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
      };
      
      memberService.addMember(newMember).then(added => {
        setNodes(prev => [...prev, { ...added, x: (containerRef.current?.clientWidth || 800) / 2, y: (containerRef.current?.clientHeight || 600) / 2 }]);
        
        // Sync links for referrals
        referrals.forEach(async (refName) => {
          const refNode = nodes.find(n => n.name === refName);
          if (refNode) {
            const link = await memberService.upsertMemberLink({
               church_id: church.id,
               source_id: refNode.id,
               target_id: added.id,
               type: 'Invited'
            });
            setLinks(prev => [...prev, { id: link.id, source: link.source_id, target: link.target_id, type: link.type } as any]);
          }
        });
      });
    }

    setIsAddModalOpen(false);
  };

  return (
    <div className="flex w-full flex-col bg-surface min-h-full pb-20">
      {/* Header */}
      <div className="p-6 md:p-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-outline-variant/10 bg-surface">
        <div>
          <h2 className="mb-2 font-headline-md text-on-surface">{t('memberNetwork')}</h2>
          <p className="font-label-sm text-sm text-on-surface-variant uppercase tracking-widest opacity-70">{t('memberNetworkDesc')}</p>
        </div>
        
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-[18px]">search</span>
            <input 
              type="text"
              placeholder={t('searchMembers')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full md:w-64 rounded-xl border border-outline-variant bg-surface py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-medium"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex rounded-xl border border-outline-variant p-1 bg-surface-container-lowest shadow-sm">
              <button 
                onClick={() => setViewMode('Graph')}
                className={`flex items-center justify-center w-10 h-9 rounded-lg transition-all ${viewMode === 'Graph' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-primary/5'}`}
              >
                <span className="material-symbols-outlined text-[20px]">hub</span>
              </button>
              <button 
                onClick={() => setViewMode('List')}
                className={`flex items-center justify-center w-10 h-9 rounded-lg transition-all ${viewMode === 'List' ? 'bg-primary text-on-primary' : 'text-on-surface hover:bg-primary/5'}`}
              >
                <span className="material-symbols-outlined text-[20px]">list</span>
              </button>
            </div>

            {mode === 'Manager' && (
               <button 
                onClick={() => {
                  setEditingMember(null);
                  setReferrals([]);
                  setIsAddModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-xl bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-xl hover:bg-primary transition-all"
               >
                 <span className="material-symbols-outlined text-[18px]">person_add</span>
                 {t('addMember')}
               </button>
            )}

            {mode === 'Manager' && (
              <button 
                onClick={handleExport}
                className="flex items-center gap-2 rounded-xl bg-surface-container border border-outline-variant px-4 py-2 text-[10px] font-black uppercase tracking-widest text-on-surface hover:bg-surface-container-high transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">ios_share</span>
                {t('exportNetwork')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-64 shrink-0 border-r border-outline-variant/10 bg-surface-container-low p-6 space-y-8 hidden lg:block overflow-y-auto">
           <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-outline mb-4">{t('industry')}</h4>
              <div className="space-y-2">
                 <button 
                  onClick={() => setOccupationFilter('')}
                  className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${!occupationFilter ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'}`}
                 >
                   {t('allIndustries')}
                 </button>
                 {INDUSTRIES.map(occ => (
                   <button 
                    key={occ}
                    onClick={() => setOccupationFilter(occ)}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${occupationFilter === occ ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'}`}
                   >
                     {t(occ)}
                   </button>
                 ))}
              </div>
           </div>

           <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-outline mb-4">{t('spiritualFamilyLabel')}</h4>
              <div className="space-y-2">
                 <button 
                  onClick={() => setGroupFilter('')}
                  className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${!groupFilter ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'}`}
                 >
                   {t('allGroups')}
                 </button>
                 {allGroups.map(grp => (
                   <button 
                    key={grp}
                    onClick={() => setGroupFilter(grp as string)}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${groupFilter === grp ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'}`}
                   >
                     {grp}
                   </button>
                 ))}
              </div>
           </div>

           <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-outline mb-4">{t('skillsMinistries')}</h4>
              <div className="space-y-2">
                 <button 
                  onClick={() => setSkillFilter('')}
                  className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${!skillFilter ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'}`}
                 >
                   All Skills
                 </button>
                 {SKILLS_LIST.map(skill => (
                   <button 
                    key={skill}
                    onClick={() => setSkillFilter(skill)}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${skillFilter === skill ? 'bg-primary text-on-primary' : 'hover:bg-surface-container-high text-on-surface'}`}
                   >
                     {t(skill.charAt(0).toLowerCase() + skill.slice(1).replace(/ /g, '')) || skill}
                   </button>
                 ))}
              </div>
           </div>
        </div>

        <div className="flex-1 relative bg-surface-container/10" ref={containerRef}>
            {viewMode === 'Graph' ? (
              <svg ref={svgRef} className="w-full h-full" />
            ) : (
              <div className="p-8 grid grid-cols-1 xl:grid-cols-2 gap-6 content-start">
                <AnimatePresence>
                  {nodes.filter(n => filteredNodeIds.has(n.id)).map(node => (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={node.id}
                      onClick={() => {
                        setSelectedNode(node);
                      }}
                      className={`p-4 rounded-3xl border flex items-center gap-4 transition-all cursor-pointer ${
                        selectedNode?.id === node.id ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' : 'bg-white border-outline-variant/20 hover:border-primary/50'
                      }`}
                    >
                      <div className="w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-serif font-black text-lg border" style={{ borderColor: ROLE_COLORS[node.status], color: ROLE_COLORS[node.status] }}>
                        {node.initials}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-on-surface">{node.name}</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 text-on-surface-variant mb-3">{t(node.occupation || '')}</p>
                        <div className="flex flex-wrap gap-2">
                           {node.skills?.slice(0, 2).map(skill => (
                             <span key={skill} className="px-2 py-0.5 rounded-lg border border-outline-variant/30 text-[8px] font-bold text-outline uppercase">{skill}</span>
                           ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            <AnimatePresence>
              {mode === 'Manager' && viewMode === 'Graph' && showGraphInstructions && (
                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-40">
                   <motion.div 
                     initial={{ opacity: 0, scale: 0.9, y: 20 }}
                     animate={{ opacity: 1, scale: 1, y: 0 }}
                     exit={{ opacity: 0, scale: 0.9, y: 20 }}
                     className="bg-black/95 text-white pl-8 pr-6 py-5 rounded-[40px] text-[12px] font-black uppercase tracking-[0.2em] flex items-center gap-4 border border-white/10 shadow-2xl pointer-events-auto shadow-black/50"
                   >
                      <span className="material-symbols-outlined text-primary text-2xl">touch_app</span>
                      <span className="max-w-[300px] leading-relaxed">{t('dragToLinkDesc')}</span>
                      <div className="h-8 w-px bg-white/20 ml-2"></div>
                      <button 
                        onClick={() => setShowGraphInstructions(false)}
                        className="w-10 h-10 rounded-full hover:bg-white/10 text-white/60 hover:text-white transition-all flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                   </motion.div>
                </div>
              )}
            </AnimatePresence>
        </div>

      <AnimatePresence>
        {selectedNode && (
          <motion.div 
            ref={popoverRef}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-24 right-6 bottom-6 w-80 bg-white/70 backdrop-blur-2xl rounded-[40px] shadow-[0_20px_80px_rgba(0,0,0,0.15)] border border-white/40 overflow-hidden z-[100] flex flex-col"
          >
            <div className="flex-1 overflow-y-auto no-scrollbar p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="w-16 h-16 rounded-3xl p-1 bg-white shadow-lg ring-4 ring-primary/[0.03]">
                  <div className="w-full h-full rounded-2xl border-4 flex items-center justify-center text-xl font-serif font-black" style={{ borderColor: ROLE_COLORS[selectedNode.status], color: ROLE_COLORS[selectedNode.status] }}>
                    {selectedNode.initials}
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="h-10 w-10 rounded-xl bg-white/50 hover:bg-black hover:text-white transition-all flex items-center justify-center group shadow-sm border border-white/20">
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-on-surface tracking-tight leading-tight">{selectedNode.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-black text-outline uppercase tracking-widest">{t(selectedNode.occupation || '')}</span>
                  <div className="h-1 w-1 rounded-full bg-outline opacity-20"></div>
                  <span className="text-[10px] font-black text-primary uppercase tracking-widest">{selectedNode.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-white/40 border border-white/20 shadow-sm">
                  <p className="text-[8px] font-black text-outline uppercase tracking-widest mb-1">{t('age')}</p>
                  <p className="text-sm font-bold text-on-surface">{selectedNode.age || '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white/40 border border-white/20 shadow-sm">
                  <p className="text-[8px] font-black text-outline uppercase tracking-widest mb-1">Family</p>
                  <p className="text-sm font-bold text-on-surface truncate">{selectedNode.family}</p>
                </div>
              </div>

              <div className="space-y-2 mb-8">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 border border-white/20 hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
                  <span className="material-symbols-outlined text-[18px] text-outline">alternate_email</span>
                  <span className="text-xs font-bold text-on-surface truncate flex-1">{selectedNode.email || '—'}</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/40 border border-white/20 hover:border-primary/20 transition-all cursor-pointer group shadow-sm">
                  <span className="material-symbols-outlined text-[18px] text-outline">call</span>
                  <span className="text-xs font-bold text-on-surface flex-1">{selectedNode.phone || '—'}</span>
                </div>
              </div>

              {mode === 'Manager' && (
                <button 
                  onClick={() => {
                    setEditingMember(selectedNode);
                    setReferrals(selectedNode.friends_with?.map(id => nodes.find(n => n.id === id)?.name || id) || selectedNode.referral_source?.split(',').map((s: string)=>s.trim()).filter(Boolean) || []);
                    setIsAddModalOpen(true);
                  }}
                  className="w-full py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary transition-all shadow-xl shadow-black/10 active:scale-95"
                >
                  Quick Edit
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsAddModalOpen(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-xl"
            />
            <motion.div 
               initial={{ scale: 0.9, opacity: 0, y: 30 }}
               animate={{ scale: 1, opacity: 1, y: 0 }}
               exit={{ scale: 0.9, opacity: 0, y: 30 }}
               className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-[48px] shadow-2xl p-8 md:px-16 md:py-16 overflow-y-auto border border-white/20"
            >
               <div className="flex items-center justify-between mb-12">
                  <div>
                    <h2 key={editingMember?.id || 'new'} className="text-4xl font-serif font-black text-on-surface mb-2">{editingMember ? 'Edit Profile' : t('addMember')}</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Community Growth & Registration</p>
                  </div>
                  <button onClick={() => { setIsAddModalOpen(false); setEditingMember(null); }} className="w-14 h-14 rounded-2xl bg-surface-container hover:bg-black hover:text-white transition-all flex items-center justify-center group">
                     <span className="material-symbols-outlined text-3xl group-hover:rotate-90 transition-transform">close</span>
                  </button>
               </div>

               <form key={editingMember?.id || 'new'} onSubmit={handleAddMember} className="space-y-16">
                  {/* Personal Info */}
                  <section>
                    <div className="flex items-center gap-6 mb-10">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary shrink-0">{t('personalInfo')}</span>
                       <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent"></div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('fullName')} *</label>
                        <div className="relative group/input">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within/input:text-primary transition-colors">person</span>
                          <input name="name" required defaultValue={editingMember?.name} placeholder="e.g. John Doe" className="w-full bg-surface-container-low border-2 border-transparent pl-14 pr-8 py-5 rounded-3xl focus:border-primary focus:bg-white outline-none font-bold transition-all shadow-inner hover:bg-surface-container" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('industry')}</label>
                        <div className="relative group/select">
                          <select name="occupation" defaultValue={editingMember?.occupation || 'industryEducation'} className="w-full bg-surface-container-low border-2 border-transparent px-8 py-5 rounded-[32px] focus:border-primary focus:bg-white outline-none font-bold text-sm md:text-base transition-all appearance-none cursor-pointer hover:bg-surface-container shadow-inner">
                             {INDUSTRIES.map(occKey => (
                               <option key={occKey} value={occKey}>{t(occKey)}</option>
                             ))}
                          </select>
                          <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none group-focus-within/select:rotate-180 transition-transform">expand_more</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('phoneLabel')}</label>
                        <div className="relative group/input">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within/input:text-primary transition-colors">call</span>
                          <input name="phone" defaultValue={editingMember?.phone} placeholder="+61 ..." className="w-full bg-surface-container-low border-2 border-transparent pl-14 pr-8 py-5 rounded-3xl focus:border-primary focus:bg-white outline-none font-bold transition-all shadow-inner hover:bg-surface-container" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('email')}</label>
                        <div className="relative group/input">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within/input:text-primary transition-colors">alternate_email</span>
                          <input name="email" defaultValue={editingMember?.email} type="email" placeholder="email@example.com" className="w-full bg-surface-container-low border-2 border-transparent pl-14 pr-8 py-5 rounded-3xl focus:border-primary focus:bg-white outline-none font-bold transition-all shadow-inner hover:bg-surface-container" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('age')}</label>
                        <div className="relative group/input">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within/input:text-primary transition-colors">cake</span>
                          <input name="age" defaultValue={editingMember?.age} type="number" placeholder="25" className="w-full bg-surface-container-low border-2 border-transparent pl-14 pr-8 py-5 rounded-3xl focus:border-primary focus:bg-white outline-none font-bold transition-all shadow-inner hover:bg-surface-container" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-4">{t('dobLabel')}</label>
                        <div className="relative group/input">
                          <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within/input:text-primary transition-colors">calendar_today</span>
                          <input name="dob" defaultValue={editingMember?.dob} type="date" className="w-full bg-surface-container-low border-2 border-transparent pl-14 pr-8 py-5 rounded-3xl focus:border-primary focus:bg-white outline-none font-bold transition-all shadow-inner hover:bg-surface-container px-4" />
                        </div>
                      </div>
                    </div>
                  </section>


                  {/* Church Context */}
                  <section>
                    <div className="flex items-center gap-6 mb-10">
                       <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary shrink-0">{t('churchInfo')}</span>
                       <div className="h-px flex-1 bg-gradient-to-r from-primary/20 to-transparent"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-4">Spiritual Family / Group</label>
                        <div className="relative group/select">
                          <select name="family" defaultValue={editingMember?.family || "Church Core"} className="w-full bg-surface-container-low border-2 border-transparent px-8 py-5 rounded-[32px] focus:border-primary focus:bg-white outline-none font-bold text-lg transition-all appearance-none cursor-pointer hover:bg-surface-container shadow-inner">
                             <option value="Church Core">Church Core</option>
                             <option value="Friday Night Fellowship">Friday Night Fellowship</option>
                             <option value="Youth Ministry">Youth Ministry</option>
                             <option value="Sunday Service">Sunday Service</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none group-focus-within/select:rotate-180 transition-transform">expand_more</span>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-4">Membership Status</label>
                        <div className="relative group/select">
                          <select name="status" defaultValue={editingMember?.status || "Member"} className="w-full bg-surface-container-low border-2 border-transparent px-8 py-5 rounded-[32px] focus:border-primary focus:bg-white outline-none font-bold text-lg transition-all appearance-none cursor-pointer hover:bg-surface-container shadow-inner">
                             <option value="Member">Member</option>
                             <option value="Leader">Leader</option>
                             <option value="Pastor">Pastor</option>
                             <option value="New Friend">New Friend</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none group-focus-within/select:rotate-180 transition-transform">expand_more</span>
                        </div>
                      </div>
                      
                      <div className="space-y-4 md:col-span-2 relative">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-4">{t('referralSource')}</label>
                        <div className="relative group/referral flex flex-col gap-2 bg-surface-container-low border-2 border-transparent px-6 py-5 rounded-[32px] focus-within:border-primary focus-within:bg-white transition-all shadow-inner hover:bg-surface-container" ref={referralRef}>
                          <div className="flex flex-wrap gap-2">
                             {referrals.map(ref => (
                               <span key={ref} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                                 {ref}
                                 <button type="button" onClick={() => setReferrals(prev => prev.filter(r => r !== ref))} className="text-primary hover:text-error ml-1"><span className="material-symbols-outlined text-[14px]">close</span></button>
                               </span>
                             ))}
                          </div>
                          <div className="flex items-center w-full relative">
                            <input 
                              id="referralInput"
                              autoComplete="off"
                              value={referralSearch}
                              onFocus={() => setShowReferralDropdown(true)}
                              onChange={(e) => {
                                setReferralSearch(e.target.value);
                                setShowReferralDropdown(true);
                              }}
                              placeholder="Type to search existing members or 'Self'..." 
                              className="w-full bg-transparent outline-none font-bold text-xl px-4 py-2" 
                            />
                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-black/20 group-focus-within/referral:text-primary transition-all text-3xl">diversity_3</span>
                          </div>
                          
                          <AnimatePresence>
                            {showReferralDropdown && (
                              <motion.div 
                                initial={{ opacity: 0, y: 0, scale: 0.98 }}
                                animate={{ opacity: 1, y: 12, scale: 1 }}
                                exit={{ opacity: 0, y: 0, scale: 0.98 }}
                                className="absolute left-0 right-0 top-full bg-white/80 backdrop-blur-3xl rounded-[40px] shadow-2xl border border-white/40 overflow-hidden z-[110] max-h-72 overflow-y-auto no-scrollbar py-6 px-4"
                              >
                                <div className="mb-4 px-4 flex items-center justify-between">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">Suggestions</span>
                                </div>
                                <div className="space-y-1">
                                  {['Self', ...nodes.map(n => n.name)]
                                    .filter(name => name.toLowerCase().includes(referralSearch.toLowerCase()) && !referrals.includes(name))
                                    .map((name, i) => (
                                      <button 
                                        key={i}
                                        type="button"
                                        onClick={() => {
                                          if (!referrals.includes(name)) {
                                            setReferrals(prev => [...prev, name]);
                                          }
                                          setReferralSearch('');
                                          setShowReferralDropdown(false);
                                        }}
                                        className="w-full text-left px-6 py-4 rounded-2xl hover:bg-primary hover:text-white transition-all text-base font-bold flex items-center justify-between group"
                                      >
                                        <span>{name}</span>
                                        <span className="material-symbols-outlined text-[20px] opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">add</span>
                                      </button>
                                    ))
                                  }
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        <p className="text-[9px] font-medium text-outline opacity-50 ml-6 italic">This helps build the community connections graph automatically</p>
                      </div>

                    </div>
                  </section>

                  {/* Skills / Ministries */}
                  <section>
                    <div className="flex items-center gap-4 mb-10">
                       <div className="h-0.5 flex-1 bg-outline-variant/20"></div>
                       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary shrink-0">{t('skillsMinistries')}</h3>
                       <div className="h-0.5 flex-1 bg-outline-variant/20"></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {skillsList.map(skill => (
                         <label key={skill} className="relative flex flex-col items-center justify-center p-6 rounded-[32px] border-2 border-outline-variant/10 cursor-pointer transition-all hover:border-primary/30 has-[:checked]:border-primary has-[:checked]:bg-primary/5 group">
                            <input 
                              type="checkbox" 
                              name="skills" 
                              value={skill} 
                              defaultChecked={editingMember?.skills?.includes(skill)}
                              className="absolute opacity-0" 
                            />
                            <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center mb-3 group-hover:bg-primary/10 group-has-[:checked]:bg-primary group-has-[:checked]:text-white transition-all">
                               <span className="material-symbols-outlined text-[20px]">
                                  {skill === 'Sunday School Teacher' ? 'school' : 
                                   skill === 'Worship' ? 'music_note' : 
                                   skill === 'Usher' ? 'person_pin' : 
                                   skill === 'Preaching' ? 'campaign' : 
                                   skill === 'Kitchen' ? 'restaurant' : 
                                   'star'}
                               </span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-center">{t(skill.charAt(0).toLowerCase() + skill.slice(1).replace(/ /g, '')) || skill}</span>
                            {mode === 'Manager' && !SKILLS_LIST.includes(skill) && (
                              <button type="button" onClick={(e) => { e.preventDefault(); setSkillsList(prev => prev.filter(s => s !== skill)); }} className="absolute top-2 right-2 text-error hover:scale-110 opacity-0 group-hover:opacity-100 transition-all p-1 bg-white rounded-full"><span className="material-symbols-outlined text-[14px]">close</span></button>
                            )}
                         </label>
                       ))}
                       {mode === 'Manager' && (
                         <div className="relative flex flex-col items-center justify-center p-6 rounded-[32px] border-2 border-dashed border-outline-variant/30 hover:border-primary/50 transition-all group">
                           <input type="text" value={newTagInput} onChange={e => setNewTagInput(e.target.value)} onKeyDown={(e) => {
                             if (e.key === 'Enter') {
                               e.preventDefault();
                               if (newTagInput.trim() && !skillsList.includes(newTagInput.trim())) {
                                 setSkillsList(prev => [...prev, newTagInput.trim()]);
                                 setNewTagInput('');
                               }
                             }
                           }} placeholder="Add new tag" className="w-full bg-transparent text-center outline-none text-[10px] font-black uppercase tracking-widest" />
                           <p className="text-[8px] text-outline mt-2 italic">Press Enter</p>
                         </div>
                       )}
                    </div>
                  </section>

                  <div className="pt-8">
                     <button type="submit" className="w-full bg-black text-white h-24 rounded-[40px] text-sm font-black uppercase tracking-[0.5em] hover:bg-primary transition-all shadow-2xl hover:shadow-primary/30 active:scale-[0.98]">
                        {t('saveMember')}
                     </button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
