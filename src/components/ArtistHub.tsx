import React, { useState, useEffect } from 'react';
import { 
  Music, User, Edit3, CheckCircle, AlertCircle, RefreshCw,
  Globe, Instagram, Twitter, Facebook, ArrowLeft, Camera, FileText, Loader2
} from 'lucide-react';
import {
  getArtistProfile,
  createArtistProfile,
  updateArtistProfile,
  getEvents,
  getFollowerCount,
  ArtistProfile
} from '../services/backendService';
import { auth } from '../firebase';

export default function ArtistHub() {
  const [profile, setProfile] = useState<ArtistProfile | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Edit Form Fields
  const [isEditing, setIsEditing] = useState(false);
  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [genres, setGenres] = useState<string[]>([]);
  const [genreInput, setGenreInput] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [coverImage, setCoverImage] = useState('');
  
  const [socialLinks, setSocialLinks] = useState({
    website: '',
    instagram: '',
    twitter: '',
    facebook: ''
  });

  const loadData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const user = auth.currentUser;
      if (!user) return;

      const [artistData, allEvents] = await Promise.all([
        getArtistProfile(user.uid),
        getEvents()
      ]);
      
      setEvents(allEvents);

      if (artistData) {
        setProfile(artistData);
        setStageName(artistData.stageName || '');
        setBio(artistData.bio || '');
        setGenres(artistData.genres || []);
        setProfileImage(artistData.profileImage || '');
        setCoverImage(artistData.coverImage || '');
        setSocialLinks({
          website: artistData.socialLinks?.website || '',
          instagram: artistData.socialLinks?.instagram || '',
          twitter: artistData.socialLinks?.twitter || '',
          facebook: artistData.socialLinks?.facebook || ''
        });
        if (artistData.id) {
          getFollowerCount('artist', artistData.id).then(setFollowerCount);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const user = auth.currentUser;
    if (!user) return;

    if (!stageName.trim()) {
      setErrorMessage('Stage name is required.');
      return;
    }

    try {
      const newProfile = await createArtistProfile({
        userId: user.uid,
        stageName: stageName.trim(),
        bio,
        genres,
        profileImage: profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=crop',
        coverImage: coverImage || 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=800&auto=crop',
        socialLinks
      });
      setProfile(newProfile);
      setIsEditing(false);
      setSuccessMessage('Artist profile created successfully!');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to create profile. Please try again.');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!profile?.id) return;

    if (!stageName.trim()) {
      setErrorMessage('Stage name is required.');
      return;
    }

    try {
      await updateArtistProfile(profile.id, {
        stageName: stageName.trim(),
        bio,
        genres,
        profileImage,
        coverImage,
        socialLinks
      });
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrorMessage('Failed to save profile. Please try again.');
    }
  };

  const handleAddGenre = () => {
    if (!genreInput.trim()) return;
    if (!genres.includes(genreInput.trim())) {
      setGenres([...genres, genreInput.trim()]);
    }
    setGenreInput('');
  };

  const handleRemoveGenre = (gName: string) => {
    setGenres(prev => prev.filter(g => g !== gName));
  };

  // Filter events where this artist performs (either title matches or lists artist)
  const linkedEvents = events.filter(evt => {
    const artistNameLower = (profile?.stageName || '').toLowerCase();
    const matchesTitle = evt.title.toLowerCase().includes(artistNameLower);
    const matchesDesc = (evt.description || '').toLowerCase().includes(artistNameLower);
    const inArtistsList = Array.isArray(evt.artists) && evt.artists.some((a: any) => 
      String(a).toLowerCase().includes(artistNameLower) || 
      (typeof a === 'object' && a !== null && String(a.name || '').toLowerCase().includes(artistNameLower))
    );
    return matchesTitle || matchesDesc || inArtistsList;
  });

  return (
    <div className="space-y-6 text-left" id="artist-hub-root">
      
      {/* Header Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4   pb-4">
        <div>
          <h2 className="font-display font-medium text-2xl text-neutral-900 flex items-center gap-2">
            Your Artist Profile
            <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full text-sentence  ">
              Artist
            </span>
          </h2>
          <p className="text-xs text-neutral-505 mt-1">
            Update your bio, genres, and photos, and see which events you're linked to.
          </p>
        </div>

        {profile && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 py-2.5 px-5 bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-bold text-sentence tracking-wider rounded-full shadow-md cursor-pointer transition-transform active:scale-97"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Profile</span>
          </button>
        )}
      </div>

      {/* Success / Error Banners */}
      {successMessage && (
        <div className="bg-emerald-50   text-emerald-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50   text-red-800 text-xs py-3 px-4 rounded-xl flex items-center gap-2 font-medium">
          <AlertCircle className="w-4 h-4 text-red-650 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-neutral-450 text-sentence tracking-widest font-bold font-mono">Loading your profile...</p>
        </div>
      ) : (
        <div className="transition-all duration-300">
          
          {/* PROFILE FORM (CREATING OR EDITING) */}
          {(isEditing || !profile) && (
            <div className="bg-white   rounded-2xl p-6 sm:p-8 shadow-3xs max-w-2xl text-left font-semibold text-neutral-800">
              <div className="flex items-center gap-2   pb-3.5 mb-6">
                {profile && (
                  <button onClick={() => setIsEditing(false)} className="text-neutral-500 hover:text-black font-bold text-sentence tracking-wider text-xs flex items-center gap-1 hover:underline cursor-pointer">
                    <ArrowLeft className="w-4 h-4" /> Cancel
                  </button>
                )}
                <h3 className="font-display font-medium text-base text-neutral-900 text-sentence ml-2">
                  {profile ? 'Edit Your Profile' : 'Create Your Artist Profile'}
                </h3>
              </div>

              <form onSubmit={profile ? handleUpdateProfile : handleCreateProfile} className="space-y-4 text-xs font-bold text-neutral-800">

                <div className="space-y-1.5">
                  <label className="text-neutral-500 text-sentence tracking-wider block">Stage Name</label>
                  <input 
                    type="text"
                    className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                    value={stageName}
                    onChange={(e) => setStageName(e.target.value)}
                    placeholder="e.g. DJ Sparkle or Maestro Symphony Orchestra"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-neutral-500 text-sentence tracking-wider block">Profile Image URL</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                      value={profileImage}
                      onChange={(e) => setProfileImage(e.target.value)}
                      placeholder="e.g. https://images.unsplash.com/..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-neutral-500 text-sentence tracking-wider block">Cover Image URL</label>
                    <input 
                      type="text"
                      className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  font-mono"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="e.g. https://images.unsplash.com/..."
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-500 text-sentence tracking-wider block">Genres</label>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 "
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      placeholder="e.g. Opera, Vocalist, Techno, Orchestral"
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGenre(); }}}
                    />
                    <button 
                      type="button"
                      onClick={handleAddGenre}
                      className="py-2.5 px-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg cursor-pointer font-bold text-sentence transition-transform active:scale-97 text-[11px]"
                    >
                      Add genre
                    </button>
                  </div>
                  {/* Genre tags bubble row */}
                  {genres.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {genres.map((g) => (
                        <span key={g} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50   text-indigo-700 text-[10px] font-black text-sentence rounded-full">
                          <span>{g}</span>
                          <button type="button" onClick={() => handleRemoveGenre(g)} className="text-indigo-900 font-extrabold hover:text-red-650 shrink-0">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-neutral-500 text-sentence tracking-wider block">Biography</label>
                  <textarea 
                    className="w-full bg-neutral-50   p-2.5 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50  h-24"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Short summary of background performance rosters, conservatory trainings, tour dates..."
                  />
                </div>

                {/* Social links block */}
                <div className="space-y-3.5 pt-2">
                  <h4 className="text-neutral-500 text-sentence tracking-widest block text-[10px]   pb-1.5">Social Links</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-neutral-450 text-sentence block text-[9px]">Website</label>
                      <input 
                        type="text"
                        className="w-full bg-neutral-50   p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                        value={socialLinks.website}
                        onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                        placeholder="e.g. musicartist.com"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-neutral-455 text-sentence block text-[9px]">Instagram Handle</label>
                      <input 
                        type="text"
                        className="w-full bg-neutral-50   p-2 rounded-lg outline-none focus:ring-1 focus:ring-[#E34718]/50 font-mono"
                        value={socialLinks.instagram}
                        onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                        placeholder="instagram.com/artist"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4   flex items-center justify-end gap-3">
                  {profile && (
                    <button 
                      type="button" 
                      onClick={() => setIsEditing(false)}
                      className="py-2.5 px-4 bg-white   hover:bg-neutral-55 text-neutral-850 text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="py-2.5 px-5 bg-neutral-900   hover:bg-neutral-800 text-white text-xs font-bold text-sentence tracking-wider rounded-full transition-transform active:scale-97 cursor-pointer shadow-md"
                  >
                    Save Profile
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* ACTIVE DISCIPLINED VIEW OF THE ARTIST PROFILE BOARD */}
          {profile && !isEditing && (
            <div className="space-y-6">
              
              {/* Cover Banner card with overlay */}
              <div className="relative bg-[#1a1a1a] h-56 rounded-2xl overflow-hidden   text-left">
                {profile.coverImage && (
                  <img 
                    src={profile.coverImage} 
                    alt={profile.stageName}
                    className="w-full h-full object-cover opacity-45"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-transparent"></div>
                
                {/* Stage profile meta inside cover */}
                <div className="absolute bottom-6 left-6 right-6 flex items-end gap-4.5">
                  <img 
                    src={profile.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=crop'} 
                    alt={profile.stageName}
                    className="w-20 h-20 bg-neutral-950 rounded-2xl object-cover object-top shadow-md shrink-0"
                  />
                  <div>
                    <h3 className="text-2xl sm:text-3xl font-display font-medium text-white text-sentence leading-none">{profile.stageName}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {genres.map((g) => (
                        <span key={g} className="inline-block px-2.5 py-0.5 bg-indigo-650/45 text-white   text-[9px] font-black text-sentence rounded-full">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <span className="font-mono font-bold text-white text-lg block leading-none">{followerCount}</span>
                    <span className="text-[9px] text-white/60 font-bold text-sentence tracking-wider block mt-1">Followers</span>
                  </div>
                </div>
              </div>

              {/* Bio & Details Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                
                {/* Left col: bio & socials */}
                <div className="md:col-span-2 bg-white   rounded-2xl p-6 sm:p-7 space-y-4">
                  <h4 className="text-xs text-sentence font-black text-indigo-700 tracking-wider   pb-1.5">Biography</h4>
                  <p className="text-xs text-neutral-510 leading-relaxed font-semibold whitespace-pre-wrap">
                    {profile.bio || 'No bio added yet. Click Edit Profile to add one.'}
                  </p>
                  
                  {/* Social icons row */}
                  <div className="pt-3   flex flex-wrap items-center gap-3 text-neutral-550">
                    {socialLinks.website && (
                      <a href={`https://${socialLinks.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:text-[#E34718] font-bold">
                        <Globe className="w-4 h-4" />
                        <span>Official website</span>
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a href={`https://${socialLinks.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:text-[#E34718] font-bold">
                        <Instagram className="w-4 h-4" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {socialLinks.twitter && (
                      <a href={`https://${socialLinks.twitter}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:text-[#E34718] font-bold">
                        <Twitter className="w-4 h-4" />
                        <span>Twitter</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Right col: gigs linked status */}
                <div className="bg-white   rounded-2xl p-6 sm:p-7 space-y-4">
                  <h4 className="text-xs text-sentence font-black text-indigo-700 tracking-wider   pb-1.5">Upcoming Events ({linkedEvents.length})</h4>
                  {linkedEvents.length === 0 ? (
                    <div className="text-center py-6 text-neutral-400">
                      <Music className="w-6 h-6 mx-auto mb-2 opacity-50" />
                      <p className="text-[10px] font-bold text-sentence tracking-wide">No events linked yet</p>
                      <p className="text-[11px] leading-normal font-semibold mt-1">The event organizer will link your profile to upcoming shows.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {linkedEvents.map((evt) => (
                        <div key={evt.id} className="p-3 bg-neutral-50/50   rounded-xl flex items-center gap-2.5">
                          <img 
                            src={evt.bannerImage || evt.image} 
                            alt={evt.title}
                            className="w-10 h-10 rounded-lg object-cover shrink-0  "
                          />
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-neutral-900 truncate text-sentence block leading-none">{evt.title}</h5>
                            <span className="text-[10px] text-neutral-450 font-semibold block mt-1">{evt.date} · {evt.venue}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
              
            </div>
          )}

        </div>
      )}

    </div>
  );
}
