import{a as zt}from"./chunk-VOS5BN7D.js";import{$a as Qe,C as Mo,Ca as de,D as Re,Ea as qt,F as Co,G as le,Ga as ce,H as we,Ha as q,Ia as Eo,J as N,Ja as ze,K as To,Ka as Zt,L as Vt,M as Be,Ma as Uo,N as ye,O as jt,R as Ye,S as V,T as So,U as Ao,V as Lo,W as Xt,X as Oe,Ya as Wo,Z as ut,a as fo,aa as Lt,ab as Ro,c as Tt,ca as Do,cb as Bo,d as ie,da as zo,e as St,ea as Fe,f as at,fa as G,g as uo,gb as Oo,h as ho,i as vo,j as po,jb as Fo,k as mo,l as xo,m as go,n as At,o as wo,p as bo,q as it,qa as Po,sa as rt,t as yo,ta as Ke,ua as Dt,va as It,w as be}from"./chunk-62GPKFJK.js";var ht=class x extends G{constructor(){let e=x.SkyShader,r=new q({name:e.name,uniforms:ce.clone(e.uniforms),vertexShader:e.vertexShader,fragmentShader:e.fragmentShader,side:Tt,depthWrite:!1});super(new Ke(1,1,1),r),this.isSky=!0}};ht.SkyShader={name:"SkyShader",uniforms:{turbidity:{value:2},rayleigh:{value:1},mieCoefficient:{value:.005},mieDirectionalG:{value:.8},sunPosition:{value:new N},cloudScale:{value:2e-4},cloudSpeed:{value:2e-5},cloudCoverage:{value:.4},cloudDensity:{value:.4},cloudElevation:{value:.5},showSunDisc:{value:1},time:{value:0}},vertexShader:`
		uniform vec3 sunPosition;
		uniform float rayleigh;
		uniform float turbidity;
		uniform float mieCoefficient;

		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying float vSunfade;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		// constants for atmospheric scattering
		const float e = 2.71828182845904523536028747135266249775724709369995957;
		const float pi = 3.141592653589793238462643383279502884197169;

		// wavelength of used primaries, according to preetham
		const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
		// this pre-calculation replaces older TotalRayleigh(vec3 lambda) function:
		// (8.0 * pow(pi, 3.0) * pow(pow(n, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * N * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn))
		const vec3 totalRayleigh = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

		// mie stuff
		// K coefficient for the primaries
		const float v = 4.0;
		const vec3 K = vec3( 0.686, 0.678, 0.666 );
		// MieConst = pi * pow( ( 2.0 * pi ) / lambda, vec3( v - 2.0 ) ) * K
		const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

		// earth shadow hack
		// cutoffAngle = pi / 1.95;
		const float cutoffAngle = 1.6110731556870734;
		const float steepness = 1.5;
		const float EE = 1000.0;

		float sunIntensity( float zenithAngleCos ) {
			zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 );
			return EE * max( 0.0, 1.0 - pow( e, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
		}

		vec3 totalMie( float T ) {
			float c = ( 0.2 * T ) * 10E-18;
			return 0.434 * c * MieConst;
		}

		void main() {

			vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
			vWorldPosition = worldPosition.xyz;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			gl_Position.z = gl_Position.w; // set z to camera.far

			vSunDirection = normalize( sunPosition );

			vSunE = sunIntensity( vSunDirection.y );

			vSunfade = 1.0 - clamp( 1.0 - exp( ( sunPosition.y / 450000.0 ) ), 0.0, 1.0 );

			float rayleighCoefficient = rayleigh - ( 1.0 * ( 1.0 - vSunfade ) );

			// extinction (absorption + out scattering)
			// rayleigh coefficients
			vBetaR = totalRayleigh * rayleighCoefficient;

			// mie coefficients
			vBetaM = totalMie( turbidity ) * mieCoefficient;

		}`,fragmentShader:`
		varying vec3 vWorldPosition;
		varying vec3 vSunDirection;
		varying vec3 vBetaR;
		varying vec3 vBetaM;
		varying float vSunE;

		uniform float mieDirectionalG;
		uniform float cloudScale;
		uniform float cloudSpeed;
		uniform float cloudCoverage;
		uniform float cloudDensity;
		uniform float cloudElevation;
		uniform float showSunDisc;
		uniform float time;

		// gradient at a lattice corner; sinless hash so every GPU produces the same clouds
		vec2 gradient( vec2 i ) {
			vec3 p = fract( i.xyx * vec3( 0.1031, 0.1030, 0.0973 ) );
			p += dot( p, p.yzx + 33.33 );
			return fract( ( p.xx + p.yz ) * p.zy ) * 2.0 - 1.0;
		}

		// 2D gradient noise: isotropic lobes like Perlin at value-noise cost
		float noise( vec2 p ) {
			vec2 i = floor( p );
			vec2 f = fract( p );
			vec2 u = f * f * f * ( f * ( f * 6.0 - 15.0 ) + 10.0 ); // quintic fade
			float a = dot( gradient( i ), f );
			float b = dot( gradient( i + vec2( 1.0, 0.0 ) ), f - vec2( 1.0, 0.0 ) );
			float c = dot( gradient( i + vec2( 0.0, 1.0 ) ), f - vec2( 0.0, 1.0 ) );
			float d = dot( gradient( i + vec2( 1.0, 1.0 ) ), f - vec2( 1.0, 1.0 ) );
			return mix( mix( a, b, u.x ), mix( c, d, u.x ), u.y ) * 1.6; // ~[-1,1]
		}

		// fbm; per-octave drift makes clouds billow instead of scrolling as a rigid stamp
		float fbm( vec2 p, float drift ) {
			float result = 0.0;
			float amplitude = 1.0;
			for ( int i = 0; i < 4; i ++ ) {
				result += amplitude * noise( p );
				amplitude *= 0.5;
				p = p * 2.0 + drift;
			}
			return result;
		}

		// constants for atmospheric scattering
		const float pi = 3.141592653589793238462643383279502884197169;

		const float n = 1.0003; // refractive index of air
		const float N = 2.545E25; // number of molecules per unit volume for air at 288.15K and 1013mb (sea level -45 celsius)

		// optical length at zenith for molecules
		const float rayleighZenithLength = 8.4E3;
		const float mieZenithLength = 1.25E3;
		// 66 arc seconds -> degrees, and the cosine of that
		const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926848692873900859324;

		// 3.0 / ( 16.0 * pi )
		const float THREE_OVER_SIXTEENPI = 0.05968310365946075;
		// 1.0 / ( 4.0 * pi )
		const float ONE_OVER_FOURPI = 0.07957747154594767;

		float rayleighPhase( float cosTheta ) {
			return THREE_OVER_SIXTEENPI * ( 1.0 + pow( cosTheta, 2.0 ) );
		}

		float hgPhase( float cosTheta, float g ) {
			float g2 = pow( g, 2.0 );
			float inverse = 1.0 / pow( 1.0 - 2.0 * g * cosTheta + g2, 1.5 );
			return ONE_OVER_FOURPI * ( ( 1.0 - g2 ) * inverse );
		}

		void main() {

			vec3 direction = normalize( vWorldPosition - cameraPosition );

			// optical length
			// cutoff angle at 90 to avoid singularity in next formula.
			float zenithAngle = acos( max( 0.0, direction.y ) );
			float inverse = 1.0 / ( cos( zenithAngle ) + 0.15 * pow( 93.885 - ( ( zenithAngle * 180.0 ) / pi ), -1.253 ) );
			float sR = rayleighZenithLength * inverse;
			float sM = mieZenithLength * inverse;

			// combined extinction factor
			vec3 Fex = exp( -( vBetaR * sR + vBetaM * sM ) );

			// in scattering
			float cosTheta = dot( direction, vSunDirection );

			float rPhase = rayleighPhase( cosTheta * 0.5 + 0.5 );
			vec3 betaRTheta = vBetaR * rPhase;

			float mPhase = hgPhase( cosTheta, mieDirectionalG );
			vec3 betaMTheta = vBetaM * mPhase;

			vec3 Lin = pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * ( 1.0 - Fex ), vec3( 1.5 ) );
			Lin *= mix( vec3( 1.0 ), pow( vSunE * ( ( betaRTheta + betaMTheta ) / ( vBetaR + vBetaM ) ) * Fex, vec3( 1.0 / 2.0 ) ), clamp( pow( 1.0 - vSunDirection.y, 5.0 ), 0.0, 1.0 ) );

			// nightsky
			float theta = acos( direction.y ); // elevation --> y-axis, [-pi/2, pi/2]
			float phi = atan( direction.z, direction.x ); // azimuth --> x-axis [-pi/2, pi/2]
			vec2 uv = vec2( phi, theta ) / vec2( 2.0 * pi, pi ) + vec2( 0.5, 0.0 );
			vec3 L0 = vec3( 0.1 ) * Fex;

			// composition + solar disc
			float sundisc = clamp( ( cosTheta - sunAngularDiameterCos ) * 50000.0, 0.0, 1.0 ) * showSunDisc;
			vec3 sundiscColor = ( 760.0 * sundisc ) * min( vSunE * Fex, 80.0 );

			vec3 texColor = ( Lin + L0 ) * 0.04 + sundiscColor + vec3( 0.0, 0.0003, 0.00075 );

			// Clouds
			if ( direction.y > 0.0 && cloudCoverage > 0.0 ) {

				// Project to cloud plane (higher elevation = clouds appear lower/closer)
				float elevation = mix( 1.0, 0.1, cloudElevation );
				vec2 cloudUV = direction.xz / ( direction.y * elevation );
				cloudUV *= cloudScale;
				cloudUV += time * cloudSpeed;

				// Cloud density field
				float evolve = time * cloudSpeed * 300.0;
				float cloudNoise = clamp( fbm( cloudUV * 1000.0, evolve ) * 0.7 + 0.5, 0.0, 1.0 );

				// Large-scale coverage variation: clear gaps next to dense banks
				float region = noise( cloudUV * 300.0 ) * 0.37 + 0.5;
				float cov = clamp( cloudCoverage + ( region - 0.5 ) * 0.6, 0.0, 1.0 );

				// Carve clouds where noise rises above the coverage level
				float threshold = 1.0 - cov;
				float cloudMask = smoothstep( threshold, threshold + 0.3, cloudNoise );

				// Fade clouds near horizon (adjusted by elevation)
				float horizonFade = smoothstep( 0.0, 0.03 + 0.06 * cloudElevation, direction.y );
				cloudMask *= horizonFade;

				// Cloud lighting from the sky's own radiance
				float dayFactor = smoothstep( -0.08, 0.3, vSunDirection.y );
				vec3 sunColor = vSunE * Fex * 0.22 * 0.04; // 0.22 ~ albedo/pi, 0.04 = exposure; the aerial composite adds the eye-leg extinction
				vec3 skyAmbient = Lin * 0.04 + vec3( 0.0, 0.0003, 0.00075 );

				// Beer-powder self-shadow from the sampled density
				float depth = max( 0.0, cloudNoise - threshold );
				float beer = exp( depth * -4.0 );
				float powder = 1.0 - beer * beer; // beer*beer == exp(-8*depth)
				float shade = mix( 0.45, 1.0, clamp( beer * powder * 2.6, 0.0, 1.0 ) ); // 2.6 = 1/0.385, normalizes beer*powder peak to 1

				// Henyey-Greenstein forward lobe ( g = 0.7 ): silver lining on rims toward the sun
				float silver = clamp( 0.51 / pow( 1.49 - cosTheta * 1.4, 1.5 ), 0.0, 3.0 ); // 0.51=1-g^2, 1.49=1+g^2, 1.4=2g
				float edge = cloudMask * ( 1.0 - cloudMask ) * 4.0;

				vec3 cloudColor = skyAmbient + sunColor * shade;
				cloudColor += sunColor * silver * edge * 0.6;
				cloudColor *= max( dayFactor, 0.03 );

				// Cloud opacity via Beer's law: density sets how solid the clouds get
				float alpha = ( 1.0 - exp( depth * cloudDensity * -12.0 ) ) * horizonFade;

				// Occlude the sun disc/glow behind opaque cloud
				texColor -= L0 * 0.04 * alpha;

				// Composite through the atmosphere so distant clouds dissolve into haze
				vec3 cloudAerial = mix( texColor, cloudColor, Fex );
				texColor = mix( texColor, cloudAerial, alpha );

			}

			gl_FragColor = vec4( texColor, 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};function No({scene:x,architecture:e,sun:r,hemi:m,renderer:E,mobile:T,plasterTexture:H,art:k=[]}){let R=new ht;R.scale.setScalar(600),R.material.depthWrite=!1,x.add(R);let Me=R.material.uniforms;Me.turbidity.value=4,Me.rayleigh.value=2.4,Me.mieCoefficient.value=.004,Me.mieDirectionalG.value=.8;let pe=new q({transparent:!0,depthWrite:!1,side:ie,toneMapped:!1,fog:!1,vertexShader:"varying vec3 gw;void main(){vec4 w=modelMatrix*vec4(position,1.);gw=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}",fragmentShader:"varying vec3 gw;void main(){float c=fract(sin(dot(floor(gw.xz*vec2(.7,.4)),vec2(12.9,78.2)))*43758.5);vec3 col=vec3(.006,.008,.016)+vec3(.004,.005,.01)*c;gl_FragColor=vec4(col,1.);}"});H.wrapS=H.wrapT=At,H.colorSpace=Re,H.anisotropy=E.capabilities.getMaxAnisotropy(),H.repeat.set(3,3);let K=[[-1,-15.1],[-1,-29.3],[-1,-43.5],[-1,-57.7],[1,-8],[1,-22.2],[1,-36.4],[1,-50.6],[1,-64.8]].map(()=>new Be(1,9999,0,0)),ue=Array.from({length:12},(l,Le)=>{let xe=k[Le];return xe?new Be(xe.side,xe.z,xe.width,xe.height):new Be(0,0,0,0)}),Ce=new Array(12).fill(1);window.__picLit=Ce;let Ee=`uniform vec4 gNiche[9];uniform vec4 gPics[12];uniform float gPicLit[12];
 float nicheIn(vec3 P){float m=0.;for(int i=0;i<0;i++){vec4 n=gNiche[i];m=max(m,smoothstep(6.12,6.3,P.x*n.x)*step(abs(P.z-n.y),1.3));}return m;}
 float gShade=-1.;float picShade(vec3 P){if(gShade>=0.)return gShade;float s=1.;for(int i=0;i<6;i++){vec4 p=gPics[i];if(p.z<=0.)continue;float wall=smoothstep(5.3,5.8,P.x*p.x);vec2 d=abs(vec2(P.z-p.y,P.y-2.52))-vec2(p.z*.5+.05,p.w*.5+.05);float sd=length(max(d,0.))+min(max(d.x,d.y),0.);s*=1.-.75*wall*smoothstep(.32,-.04,sd);}gShade=s;return s;}
 vec3 warmSpill(vec3 P){vec3 acc=vec3(0.);
  for(int i=0;i<0;i++){vec4 n=gNiche[i];float sx=P.x*n.x;float dz=P.z-n.y;float inside=smoothstep(6.12,6.3,sx);
   acc+=vec3(1.,.66,.36)*inside*exp(-dz*dz*.6)*(.4+.8*smoothstep(4.,.3,P.y));
   float dx=abs(P.x-n.x*6.);acc+=vec3(1.,.66,.38)*(1.-inside)*exp(-dz*dz*.35)*exp(-dx*1.1)*exp(-max(P.y-.1,0.)*.9)*1.3;}
  for(int i=0;i<6;i++){vec4 p=gPics[i];if(p.z<=0.)continue;float wall=smoothstep(4.2,5.6,P.x*p.x);float top=2.65+p.w*.5;float above=P.y-top;
   float hw=p.z*.5+.22;float src=6.3;float t=clamp((src-P.y)/(src-top),0.,1.6);float wdt=mix(.16,hw,min(t,1.))+max(t-1.,0.)*.5;float dz=abs(P.z-p.y);float beam=1.-smoothstep(wdt-.22,wdt+.12,dz);float vert=above>0.?mix(.35,1.,smoothstep(src,top,P.y)):exp(-above*above*.22);vert*=smoothstep(src+.1,src-.6,P.y);float dzz=0.;
   acc+=mix(vec3(.82,.88,1.),vec3(1.,.82,.6),smoothstep(top+1.6,top,P.y))*wall*beam*vert*2.1*(.3+.7*gPicLit[i]);}
  return acc;}`,_=(l,Le)=>{l.uniforms.gNiche={value:K},l.uniforms.gPics={value:ue},l.uniforms.gPicLit={value:Ce},l.fragmentShader=Ee+`
`+l.fragmentShader,l.fragmentShader=l.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
 totalEmissiveRadiance+=(diffuseColor.rgb*1.9+vec3(.05,.036,.022)*picShade(`+Le+"))*warmSpill("+Le+");")},re=new N(1.55,1,-.3).normalize(),Z=new V(0,0,0),te=new ze({color:2898524,map:H,roughness:.92,side:ie});te.onBeforeCompile=l=>{_(l,"plasterWorld"),l.uniforms.gSunDir={value:re},l.uniforms.gSunCol={value:Z},l.vertexShader=`varying vec3 plasterWorld;varying vec3 plasterNormal;
`+l.vertexShader,l.vertexShader=l.vertexShader.replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
plasterWorld=(modelMatrix*vec4(transformed,1.)).xyz;plasterNormal=normalize(mat3(modelMatrix)*normal);`),l.fragmentShader=`uniform vec3 gSunDir;uniform vec3 gSunCol;varying vec3 plasterWorld;varying vec3 plasterNormal;float plasterH;
float pH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float pN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(pH(i),pH(i+vec2(1,0)),f.x),mix(pH(i+vec2(0,1)),pH(i+1.),f.x),f.y);}float pF(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=pN(p)*a;p*=2.07;a*=.5;}return v;}
`+l.fragmentShader,l.fragmentShader=l.fragmentShader.replace("#include <map_fragment>",`vec3 bw=pow(abs(plasterNormal),vec3(4.));bw/=max(dot(bw,vec3(1.)),.001);
  vec3 p=plasterWorld*.65;vec4 surface=texture2D(map,p.yz)*bw.x+texture2D(map,p.xz)*bw.y+texture2D(map,p.xy)*bw.z;
  vec3 q=plasterWorld*.21;vec4 surface2=texture2D(map,q.yz+.37)*bw.x+texture2D(map,q.xz+.37)*bw.y+texture2D(map,q.xy+.37)*bw.z;
  surface=mix(surface,surface2,.45);surface.rgb=mix(vec3(dot(surface.rgb,vec3(.33))),surface.rgb,.6);surface.rgb=mix(vec3(.82),surface.rgb,.45)/.82;
  // large, soft tonal mottling (warm / cool patches like hand-applied plaster)
  vec2 mp=bw.x>.5?plasterWorld.zy:(bw.y>.5?plasterWorld.xz:plasterWorld.xy);float mott=pF(mp*.23);float mott2=pF(mp*.9+3.1);
  vec3 tone=mix(vec3(.9,.95,1.06),vec3(1.06,1.,.94),mott)*(.9+.2*mott2);
  // soft occlusion: darker near the floor, in the vault and toward corners
  float ao=mix(.72,1.,smoothstep(.0,1.6,plasterWorld.y))*mix(1.,.86,smoothstep(5.8,7.6,plasterWorld.y));
  vec3 grade=mix(vec3(1.),vec3(.62,.66,.8),smoothstep(3.,7.6,plasterWorld.y));
  diffuseColor.rgb*=surface.rgb*tone*ao*grade;diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.62,.44,.28)*surface.rgb,nicheIn(plasterWorld));diffuseColor.rgb*=picShade(plasterWorld);
  plasterH=dot(surface.rgb,vec3(.3,.59,.11))*.7+mott2*.3;`),l.fragmentShader=l.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
  {vec3 L=normalize(gSunDir);vec3 wn=normalize(plasterNormal);if(dot(wn,vec3(-plasterWorld.x,0.,0.))<0.)wn=-wn;float ndl=max(dot(wn,L),0.);
   float h=max(7.75-plasterWorld.y,0.)/L.y;vec3 r=plasterWorld+L*h;float soft=.04+h*.055;
   float ap=(1.-smoothstep(2.62-soft,2.62+soft,abs(r.x)))*smoothstep(-72.3,-71.2,r.z)*(1.-smoothstep(-1.2,-.2,r.z));
   vec2 d=(.5-abs(fract(vec2(r.x/1.31,r.z/2.42))-.5))*vec2(1.31,2.42);
   float bars=smoothstep(.035,.035+soft,d.x)*smoothstep(.05,.05+soft,d.y);
   float g=ap*bars*ndl*(.85+.3*pF(plasterWorld.zy*.35));
   totalEmissiveRadiance+=diffuseColor.rgb*gSunCol*g;}`),l.fragmentShader=l.fragmentShader.replace("#include <normal_fragment_maps>",`#include <normal_fragment_maps>
  {vec3 vp=-vViewPosition;vec3 dpx=dFdx(vp),dpy=dFdy(vp);float dHx=dFdx(plasterH),dHy=dFdy(plasterH);
   vec3 r1=cross(dpy,normal),r2=cross(normal,dpx);float det=dot(dpx,r1);vec3 g=sign(det)*(dHx*r1+dHy*r2)*0.;
   normal=normalize(abs(det)*normal-g);}`)};let Ae=new ze({color:6044194,roughness:.34,metalness:0,side:ie});Ae.onBeforeCompile=l=>{l.vertexShader=`varying vec3 stoneWorld;
`+l.vertexShader.replace("#include <worldpos_vertex>",`#include <worldpos_vertex>
stoneWorld=(modelMatrix*vec4(transformed,1.)).xyz;`),l.fragmentShader=`varying vec3 stoneWorld;
`+l.fragmentShader,_(l,"stoneWorld"),l.fragmentShader=l.fragmentShader.replace("#include <map_fragment>",`#include <map_fragment>
 float plank=floor(stoneWorld.x*5.);float seg=floor(stoneWorld.z*.35+fract(sin(plank*7.3)*91.)*3.);float rnd=fract(sin(dot(vec2(plank,seg),vec2(12.9,78.2)))*43758.5);float grain=sin(stoneWorld.z*38.+sin(stoneWorld.z*3.+plank)*4.)*.5+.5;float gap=smoothstep(.0,.04,fract(stoneWorld.x*5.))*smoothstep(1.,.96,fract(stoneWorld.x*5.));diffuseColor.rgb*=(.78+.35*rnd)*(.9+.1*grain)*mix(.35,1.,gap)*mix(.7,1.,smoothstep(3.9,4.4,abs(stoneWorld.x)));`)};let Ue=new Fe({color:263691}),Ne=new Fe({color:new V(.7,.5,.3),toneMapped:!1,side:ie});e.traverse(l=>{if(!l.isMesh)return;{let lt=new Lo().setFromObject(l);if(lt.min.y>7.2){if(/grid/i.test(l.name+"|"+(l.parent?l.parent.name:""))){l.visible=!1;return}l.material=lt.max.z<-74.5?Ne:te,l.userData.ceil=!0;return}}(l.name==="walkways"||l.name==="stone_joints")&&(l.material=Ae);let Le=l.name+"|"+(l.parent?l.parent.name:""),xe=/(^|\|)ceiling(_oval)?(_\d+)?($|\|)/.test(Le)&&!/surround|grid/.test(Le);l.castShadow=!xe,l.receiveShadow=!xe,xe?l.material=pe:(l.name==="wall"||l.name==="oval_ceiling_surround")&&(l.material=te)}),E.shadowMap.enabled=!T,E.shadowMap.type=fo,E.shadowMap.autoUpdate=!1,E.shadowMap.needsUpdate=!0,r.castShadow=!T,r.shadow.mapSize.set(2048,2048),r.shadow.radius=5,Object.assign(r.shadow.camera,{left:-17,right:17,top:19,bottom:-19,near:1,far:140}),r.shadow.bias=-2e-4,r.shadow.normalBias=.06,r.shadow.camera.updateProjectionMatrix(),x.add(r.target);let W=new G(new de(180,180),new q({transparent:!0,depthWrite:!1,side:ie,uniforms:{time:{value:0},light:{value:new V(16771533)},opacity:{value:.7}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"varying vec2 vUv;uniform float time;uniform vec3 light;uniform float opacity;float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}void main(){vec2 p=vUv*20.+vec2(time*.001,0);float f=0.,amp=.55;for(int i=0;i<5;i++){f+=noise(p)*amp;p=p*2.03+3.1;amp*=.5;}float a=smoothstep(.40,.70,f)*opacity;gl_FragColor=vec4(light,a);}"}));W.rotation.x=-Math.PI/2,W.position.set(0,48,-35),x.add(W);let ae=new G(new Ke(11.7,7.65,72),new q({side:Tt,transparent:!0,blending:at,depthTest:!1,depthWrite:!1,uniforms:{sunDir:{value:new N},sunColor:{value:new V},density:{value:.025},strength:{value:1},time:{value:0}},vertexShader:"varying vec3 world;void main(){world=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(world,1.);}",fragmentShader:`varying vec3 world;uniform vec3 sunDir;uniform vec3 sunColor;uniform float density;uniform float strength;uniform float time;
 float roofLight(vec3 p){if(sunDir.y<.04)return 0.;vec3 r=p+sunDir*((7.95-p.y)/sunDir.y);float aperture=(1.-smoothstep(2.3,3.3,abs(r.x)))*smoothstep(-72.6,-72.,r.z)*(1.-smoothstep(-.2,0.,r.z));vec2 cell=abs(fract(vec2((r.x+3.)/1.5,-r.z/2.42)+.5)-.5);float bars=mix(.45,1.,smoothstep(.0,.2,cell.x)*smoothstep(.0,.16,cell.y));float cloudGap=.22+.78*smoothstep(.2,.8,sin(r.z*.62+r.x*.3)*.5+.5);return aperture*bars*cloudGap;}
 void main(){vec3 rd=normalize(world-cameraPosition);vec3 inv=1./(rd+vec3(.000001));vec3 a=(vec3(-5.85,.08,-72.5)-cameraPosition)*inv,b=(vec3(5.85,7.7,-.2)-cameraPosition)*inv;vec3 lo=min(a,b),hi=max(a,b);float nearT=max(0.,max(lo.x,max(lo.y,lo.z))),farT=min(hi.x,min(hi.y,hi.z));if(farT<=nearT)discard;float stepSize=min(farT-nearT,85.)/14.;vec3 light=vec3(0);float trans=1.;float jit=.5+.25*(fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))))-.5);for(int i=0;i<14;i++){vec3 p=cameraPosition+rd*(nearT+(float(i)+jit)*stepSize);float mist=1.+1.4*exp(-max(p.y,0.)*1.4)*(.7+.3*sin(p.z*.35+time*.15+p.x*.6));float d=density*mist;float atten=exp(-d*stepSize);float shaft=roofLight(p);light+=trans*(1.-atten)*(vec3(.010,.008,.016)+sunColor*shaft*strength*5.);trans*=atten;}gl_FragColor=vec4(light,0.);}`}));ae.position.set(0,3.9,-36.35),ae.renderOrder=9,x.add(ae);let me=[{at:0,elev:30,az:-62,color:16767421,power:2.1},{at:.23,elev:48,az:-22,color:16773344,power:2.4},{at:.45,elev:34,az:28,color:16768192,power:2.2},{at:.595,elev:16,az:60,color:16753274,power:2},{at:.72,elev:6,az:72,color:13662854,power:.8},{at:.9,elev:-12,az:85,color:7506104,power:0}];R.material.uniforms.twilightStrength={value:1},R.material.uniforms.dayMix={value:0},R.material.fragmentShader=`uniform float twilightStrength;uniform float dayMix;
`+R.material.fragmentShader,R.material.fragmentShader=R.material.fragmentShader.replace("gl_FragColor = vec4( texColor, 1.0 );","float horizon=pow(1.-max(direction.y,0.),2.);vec3 dayCol=mix(vec3(.28,.42,.68),vec3(.72,.74,.78),horizon);vec3 dusk=mix(vec3(.12,.085,.25),vec3(.75,.36,.4),horizon);vec3 twilight=mix(dayCol,dusk,dayMix);vec3 lil=mix(vec3(.34,.36,.86),vec3(.8,.62,.9),pow(horizon,1.6));gl_FragColor=vec4((lil*1.15+texColor*.02)*twilightStrength,1.);");let Q=new N,wt=new V,$=-1,nt=0;E.shadowMap.enabled=!1,r.castShadow=!1,r.intensity=0,ae.visible=!1;let Ge=new Bo(9083600,0,5.4,72);Ge.position.set(0,7.7,-36.3),Ge.lookAt(0,0,-36.3),Ge.visible=!1;let je=new Qe(16763018,70,16,1.6);return je.position.set(0,2.6,-74),x.add(je),m.color.set(7372976),m.groundColor.set(2759698),m.intensity=.11,x.environmentIntensity=.06,Me.sunPosition.value.set(.2,.12,-1).normalize(),R.material.uniforms.twilightStrength.value=1,R.material.uniforms.dayMix.value=.35,W.material.uniforms.light.value.set(14271728),W.material.uniforms.opacity.value=.22,{skyLight:Ge,archGlow:je,sky:R,glass:pe,gSunDir:re,gSunCol:Z,mirrorHidden:[ae,W],update(l,Le,xe){W.material.uniforms.time.value=l}}}var Je=class x extends G{constructor(e,r={}){super(e),this.isReflector=!0,this.type="Reflector",this.forceUpdate=!1,this._reflectionCameras=new WeakMap;let m=this,E=r.color!==void 0?new V(r.color):new V(8355711),T=r.textureWidth||512,H=r.textureHeight||512,k=r.clipBias||0,R=r.shader||x.ReflectorShader,Me=r.multisample!==void 0?r.multisample:4,pe=new Lt,Se=new N,K=new N,ue=new N,Ce=new jt,Ee=new N(0,0,-1),_=new Be,re=new N,Z=new N,te=new Be,Ae=new jt,Ue=new ye(T,H,{samples:Me,type:be}),Ne=new q({name:R.name!==void 0?R.name:"unspecified",uniforms:ce.clone(R.uniforms),fragmentShader:R.fragmentShader,vertexShader:R.vertexShader});Ne.uniforms.tDiffuse.value=Ue.texture,Ne.uniforms.color.value=E,Ne.uniforms.textureMatrix.value=Ae,this.material=Ne,this.onBeforeRender=function(W,ae,me){let Q=this.getReflectionCamera(me);if(K.setFromMatrixPosition(m.matrixWorld),ue.setFromMatrixPosition(me.matrixWorld),Ce.extractRotation(m.matrixWorld),Se.set(0,0,1),Se.applyMatrix4(Ce),re.subVectors(K,ue),re.dot(Se)>0===!0&&this.forceUpdate===!1)return;re.reflect(Se).negate(),re.add(K),Ce.extractRotation(me.matrixWorld),Ee.set(0,0,-1),Ee.applyMatrix4(Ce),Ee.add(ue),Z.subVectors(K,Ee),Z.reflect(Se).negate(),Z.add(K),Q.position.copy(re),Q.up.set(0,1,0),Q.up.applyMatrix4(Ce),Q.up.reflect(Se),Q.lookAt(Z),Q.far=me.far,Q.updateMatrixWorld(),Q.projectionMatrix.copy(me.projectionMatrix),Ae.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),Ae.multiply(Q.projectionMatrix),Ae.multiply(Q.matrixWorldInverse),Ae.multiply(m.matrixWorld),pe.setFromNormalAndCoplanarPoint(Se,K),pe.applyMatrix4(Q.matrixWorldInverse),_.set(pe.normal.x,pe.normal.y,pe.normal.z,pe.constant);let $=Q.projectionMatrix;Q.isOrthographicCamera?(te.x=(Math.sign(_.x)+$.elements[8])/$.elements[0],te.y=(Math.sign(_.y)+$.elements[9])/$.elements[5],te.z=-me.far,te.w=1):(te.x=(Math.sign(_.x)+$.elements[8])/$.elements[0],te.y=(Math.sign(_.y)+$.elements[9])/$.elements[5],te.z=-1,te.w=(1+$.elements[10])/$.elements[14]),_.multiplyScalar(2/_.dot(te)),$.elements[2]=_.x,$.elements[6]=_.y,Q.isOrthographicCamera?($.elements[10]=_.z-k,$.elements[14]=_.w-1):($.elements[10]=_.z+1-k,$.elements[14]=_.w),m.visible=!1;let nt=W.getRenderTarget(),Ge=W.xr.enabled,je=W.shadowMap.autoUpdate;W.xr.enabled=!1,W.shadowMap.autoUpdate=!1,W.setRenderTarget(Ue),W.state.buffers.depth.setMask(!0),W.autoClear===!1&&W.clear(),W.render(ae,Q),W.xr.enabled=Ge,W.shadowMap.autoUpdate=je,W.setRenderTarget(nt);let l=me.viewport;l!==void 0&&W.state.viewport(l),m.visible=!0,this.forceUpdate=!1},this.getRenderTarget=function(){return Ue},this.dispose=function(){Ue.dispose(),m.material.dispose()},this.getReflectionCamera=function(W){let ae=this._reflectionCameras.get(W);return ae===void 0&&(ae=W.clone(),this._reflectionCameras.set(W,ae)),ae}}};Je.ReflectorShader={name:"ReflectorShader",uniforms:{color:{value:null},tDiffuse:{value:null},textureMatrix:{value:null}},vertexShader:`
		uniform mat4 textureMatrix;
		varying vec4 vUv;

		#include <common>
		#include <logdepthbuf_pars_vertex>

		void main() {

			vUv = textureMatrix * vec4( position, 1.0 );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

			#include <logdepthbuf_vertex>

		}`,fragmentShader:`
		uniform vec3 color;
		uniform sampler2D tDiffuse;
		varying vec4 vUv;

		#include <logdepthbuf_pars_fragment>

		float blendOverlay( float base, float blend ) {

			return( base < 0.5 ? ( 2.0 * base * blend ) : ( 1.0 - 2.0 * ( 1.0 - base ) * ( 1.0 - blend ) ) );

		}

		vec3 blendOverlay( vec3 base, vec3 blend ) {

			return vec3( blendOverlay( base.r, blend.r ), blendOverlay( base.g, blend.g ), blendOverlay( base.b, blend.b ) );

		}

		void main() {

			#include <logdepthbuf_fragment>

			vec4 base = texture2DProj( tDiffuse, vUv );
			gl_FragColor = vec4( blendOverlay( base.rgb, color ), 1.0 );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>

		}`};var Go={name:"CopyShader",uniforms:{tDiffuse:{value:null},opacity:{value:1}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`};var fe=class{constructor(){this.isPass=!0,this.enabled=!0,this.needsSwap=!0,this.clear=!1,this.renderToScreen=!1}setSize(){}render(){console.error("THREE.Pass: .render() must be implemented in derived pass.")}dispose(){}},Jo=new Ro(-1,1,1,-1,0,1),Yt=class extends ut{constructor(){super(),this.setAttribute("position",new Oe([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Oe([0,2,0,0,2,0],2))}},_o=new Yt,Pe=class{constructor(e){this._mesh=new G(_o,e)}dispose(){this._mesh.geometry.dispose()}render(e){e.render(this._mesh,Jo)}get material(){return this._mesh.material}set material(e){this._mesh.material=e}};var st=class extends fe{constructor(e,r="tDiffuse"){super(),this.textureID=r,this.uniforms=null,this.material=null,e instanceof q?(this.uniforms=e.uniforms,this.material=e):e&&(this.uniforms=ce.clone(e.uniforms),this.material=new q({name:e.name!==void 0?e.name:"unspecified",defines:Object.assign({},e.defines),uniforms:this.uniforms,vertexShader:e.vertexShader,fragmentShader:e.fragmentShader})),this._fsQuad=new Pe(this.material)}render(e,r,m){this.uniforms[this.textureID]&&(this.uniforms[this.textureID].value=m.texture),this._fsQuad.material=this.material,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(r),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var vt=class extends fe{constructor(e,r){super(),this.scene=e,this.camera=r,this.clear=!0,this.needsSwap=!1,this.inverse=!1}render(e,r,m){let E=e.getContext(),T=e.state;T.buffers.color.setMask(!1),T.buffers.depth.setMask(!1),T.buffers.color.setLocked(!0),T.buffers.depth.setLocked(!0);let H,k;this.inverse?(H=0,k=1):(H=1,k=0),T.buffers.stencil.setTest(!0),T.buffers.stencil.setOp(E.REPLACE,E.REPLACE,E.REPLACE),T.buffers.stencil.setFunc(E.ALWAYS,H,4294967295),T.buffers.stencil.setClear(k),T.buffers.stencil.setLocked(!0),e.setRenderTarget(m),this.clear&&e.clear(),e.render(this.scene,this.camera),e.setRenderTarget(r),this.clear&&e.clear(),e.render(this.scene,this.camera),T.buffers.color.setLocked(!1),T.buffers.depth.setLocked(!1),T.buffers.color.setMask(!0),T.buffers.depth.setMask(!0),T.buffers.stencil.setLocked(!1),T.buffers.stencil.setFunc(E.EQUAL,1,4294967295),T.buffers.stencil.setOp(E.KEEP,E.KEEP,E.KEEP),T.buffers.stencil.setLocked(!0)}},Pt=class extends fe{constructor(){super(),this.needsSwap=!1}render(e){e.state.buffers.stencil.setLocked(!1),e.state.buffers.stencil.setTest(!1)}};var Et=class{constructor(e,r){if(this.renderer=e,this._pixelRatio=e.getPixelRatio(),r===void 0){let m=e.getSize(new we);this._width=m.width,this._height=m.height,r=new ye(this._width*this._pixelRatio,this._height*this._pixelRatio,{type:be}),r.texture.name="EffectComposer.rt1"}else this._width=r.width,this._height=r.height;this.renderTarget1=r,this.renderTarget2=r.clone(),this.renderTarget2.texture.name="EffectComposer.rt2",this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2,this.renderToScreen=!0,this.passes=[],this.copyPass=new st(Go),this.copyPass.material.blending=St,this.timer=new Oo}swapBuffers(){let e=this.readBuffer;this.readBuffer=this.writeBuffer,this.writeBuffer=e}addPass(e){this.passes.push(e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}insertPass(e,r){this.passes.splice(r,0,e),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}removePass(e){let r=this.passes.indexOf(e);r!==-1&&this.passes.splice(r,1)}isLastEnabledPass(e){for(let r=e+1;r<this.passes.length;r++)if(this.passes[r].enabled)return!1;return!0}render(e){this.timer.update(),e===void 0&&(e=this.timer.getDelta());let r=this.renderer.getRenderTarget(),m=!1;for(let E=0,T=this.passes.length;E<T;E++){let H=this.passes[E];if(H.enabled!==!1){if(H.renderToScreen=this.renderToScreen&&this.isLastEnabledPass(E),H.render(this.renderer,this.writeBuffer,this.readBuffer,e,m),H.needsSwap){if(m){let k=this.renderer.getContext(),R=this.renderer.state.buffers.stencil;R.setFunc(k.NOTEQUAL,1,4294967295),this.copyPass.render(this.renderer,this.writeBuffer,this.readBuffer,e),R.setFunc(k.EQUAL,1,4294967295)}this.swapBuffers()}vt!==void 0&&(H instanceof vt?m=!0:H instanceof Pt&&(m=!1))}}this.renderer.setRenderTarget(r)}reset(e){if(e===void 0){let r=this.renderer.getSize(new we);this._pixelRatio=this.renderer.getPixelRatio(),this._width=r.width,this._height=r.height,e=this.renderTarget1.clone(),e.setSize(this._width*this._pixelRatio,this._height*this._pixelRatio)}this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.renderTarget1=e,this.renderTarget2=e.clone(),this.writeBuffer=this.renderTarget1,this.readBuffer=this.renderTarget2}setSize(e,r){this._width=e,this._height=r;let m=this._width*this._pixelRatio,E=this._height*this._pixelRatio;this.renderTarget1.setSize(m,E),this.renderTarget2.setSize(m,E);for(let T=0;T<this.passes.length;T++)this.passes[T].setSize(m,E)}setPixelRatio(e){this._pixelRatio=e,this.setSize(this._width,this._height)}dispose(){this.renderTarget1.dispose(),this.renderTarget2.dispose(),this.copyPass.dispose()}};var Ut=class extends fe{constructor(e,r,m=null,E=null,T=null){super(),this.scene=e,this.camera=r,this.overrideMaterial=m,this.clearColor=E,this.clearAlpha=T,this.clear=!0,this.clearDepth=!1,this.needsSwap=!1,this.isRenderPass=!0,this._oldClearColor=new V}render(e,r,m){let E=e.autoClear;e.autoClear=!1;let T,H;this.overrideMaterial!==null&&(H=this.scene.overrideMaterial,this.scene.overrideMaterial=this.overrideMaterial),this.clearColor!==null&&(e.getClearColor(this._oldClearColor),e.setClearColor(this.clearColor,e.getClearAlpha())),this.clearAlpha!==null&&(T=e.getClearAlpha(),e.setClearAlpha(this.clearAlpha)),this.clearDepth==!0&&e.clearDepth(),e.setRenderTarget(this.renderToScreen?null:m),this.clear===!0&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),e.render(this.scene,this.camera),this.clearColor!==null&&e.setClearColor(this._oldClearColor),this.clearAlpha!==null&&e.setClearAlpha(T),this.overrideMaterial!==null&&(this.scene.overrideMaterial=H),e.autoClear=E}};var pt={name:"OutputShader",uniforms:{tDiffuse:{value:null},toneMappingExposure:{value:1}},vertexShader:`
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#elif defined( AGX_TONE_MAPPING )

				gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );

			#elif defined( NEUTRAL_TONE_MAPPING )

				gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );

			#elif defined( CUSTOM_TONE_MAPPING )

				gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`};var Wt=class extends fe{constructor(){super(),this.isOutputPass=!0,this.uniforms=ce.clone(pt.uniforms),this.material=new Eo({name:pt.name,uniforms:this.uniforms,vertexShader:pt.vertexShader,fragmentShader:pt.fragmentShader}),this._fsQuad=new Pe(this.material),this._outputColorSpace=null,this._toneMapping=null}render(e,r,m){this.uniforms.tDiffuse.value=m.texture,this.uniforms.toneMappingExposure.value=e.toneMappingExposure,(this._outputColorSpace!==e.outputColorSpace||this._toneMapping!==e.toneMapping)&&(this._outputColorSpace=e.outputColorSpace,this._toneMapping=e.toneMapping,this.material.defines={},To.getTransfer(this._outputColorSpace)===Co&&(this.material.defines.SRGB_TRANSFER=""),this._toneMapping===uo?this.material.defines.LINEAR_TONE_MAPPING="":this._toneMapping===ho?this.material.defines.REINHARD_TONE_MAPPING="":this._toneMapping===vo?this.material.defines.CINEON_TONE_MAPPING="":this._toneMapping===po?this.material.defines.ACES_FILMIC_TONE_MAPPING="":this._toneMapping===xo?this.material.defines.AGX_TONE_MAPPING="":this._toneMapping===go?this.material.defines.NEUTRAL_TONE_MAPPING="":this._toneMapping===mo&&(this.material.defines.CUSTOM_TONE_MAPPING=""),this.material.needsUpdate=!0),this.renderToScreen===!0?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(r),this.clear&&e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil),this._fsQuad.render(e))}dispose(){this.material.dispose(),this._fsQuad.dispose()}};var mt={name:"BokehShader",defines:{DEPTH_PACKING:1,PERSPECTIVE_CAMERA:1},uniforms:{tColor:{value:null},tDepth:{value:null},focus:{value:1},aspect:{value:1},aperture:{value:.025},maxblur:{value:.01},nearClip:{value:1},farClip:{value:1e3}},vertexShader:`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#include <common>

		varying vec2 vUv;

		uniform sampler2D tColor;
		uniform sampler2D tDepth;

		uniform float maxblur; // max blur amount
		uniform float aperture; // aperture - bigger values for shallower depth of field

		uniform float nearClip;
		uniform float farClip;

		uniform float focus;
		uniform float aspect;

		#include <packing>

		float getDepth( const in vec2 screenPosition ) {
			#if DEPTH_PACKING == 1
			return unpackRGBAToDepth( texture2D( tDepth, screenPosition ) );
			#else
			return texture2D( tDepth, screenPosition ).x;
			#endif
		}

		float getViewZ( const in float depth ) {
			#if PERSPECTIVE_CAMERA == 1
			return perspectiveDepthToViewZ( depth, nearClip, farClip );
			#else
			return orthographicDepthToViewZ( depth, nearClip, farClip );
			#endif
		}


		void main() {

			vec2 aspectcorrect = vec2( 1.0, aspect );

			float viewZ = getViewZ( getDepth( vUv ) );

			float factor = ( focus + viewZ ); // viewZ is <= 0, so this is a difference equation

			vec2 dofblur = vec2 ( clamp( factor * aperture, -maxblur, maxblur ) );

			vec2 dofblur9 = dofblur * 0.9;
			vec2 dofblur7 = dofblur * 0.7;
			vec2 dofblur4 = dofblur * 0.4;

			vec4 col = vec4( 0.0 );

			col += texture2D( tColor, vUv.xy );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15, -0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.15,  0.37 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.37,  0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.37, -0.15 ) * aspectcorrect ) * dofblur9 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.15, -0.37 ) * aspectcorrect ) * dofblur9 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.40,  0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur7 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur7 );

			col += texture2D( tColor, vUv.xy + ( vec2(  0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,  -0.4  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29,  0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.4,   0.0  ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2( -0.29, -0.29 ) * aspectcorrect ) * dofblur4 );
			col += texture2D( tColor, vUv.xy + ( vec2(  0.0,   0.4  ) * aspectcorrect ) * dofblur4 );

			gl_FragColor = col / 41.0;
			gl_FragColor.a = 1.0;

		}`};var Rt=class extends fe{constructor(e,r,m){super(),this.scene=e,this.camera=r;let E=m.focus!==void 0?m.focus:1,T=m.aperture!==void 0?m.aperture:.025,H=m.maxblur!==void 0?m.maxblur:1;this._renderTargetDepth=new ye(1,1,{minFilter:it,magFilter:it,type:be}),this._renderTargetDepth.texture.name="BokehPass.depth",this._materialDepth=new Uo,this._materialDepth.depthPacking=Mo,this._materialDepth.blending=St;let k=ce.clone(mt.uniforms);k.tDepth.value=this._renderTargetDepth.texture,k.focus.value=E,k.aspect.value=r.aspect,k.aperture.value=T,k.maxblur.value=H,k.nearClip.value=r.near,k.farClip.value=r.far,this.materialBokeh=new q({defines:Object.assign({},mt.defines),uniforms:k,vertexShader:mt.vertexShader,fragmentShader:mt.fragmentShader}),this.uniforms=k,this._fsQuad=new Pe(this.materialBokeh),this._oldClearColor=new V}render(e,r,m){this.scene.overrideMaterial=this._materialDepth,e.getClearColor(this._oldClearColor);let E=e.getClearAlpha(),T=e.autoClear;e.autoClear=!1,e.setClearColor(16777215),e.setClearAlpha(1),e.setRenderTarget(this._renderTargetDepth),e.clear(),e.render(this.scene,this.camera),this.uniforms.tColor.value=m.texture,this.uniforms.nearClip.value=this.camera.near,this.uniforms.farClip.value=this.camera.far,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(r),e.clear(),this._fsQuad.render(e)),this.scene.overrideMaterial=null,e.setClearColor(this._oldClearColor),e.setClearAlpha(E),e.autoClear=T}setSize(e,r){this.materialBokeh.uniforms.aspect.value=e/r,this._renderTargetDepth.setSize(e,r)}dispose(){this._renderTargetDepth.dispose(),this._materialDepth.dispose(),this.materialBokeh.dispose(),this._fsQuad.dispose()}};var xt={name:"SMAAEdgesShader",defines:{SMAA_THRESHOLD:"0.1"},uniforms:{tDiffuse:{value:null},resolution:{value:new we(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		void SMAAEdgeDetectionVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0,  1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4(  1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 2 ] = texcoord.xyxy + resolution.xyxy * vec4( -2.0, 0.0, 0.0,  2.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAAEdgeDetectionVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];

		vec4 SMAAColorEdgeDetectionPS( vec2 texcoord, vec4 offset[3], sampler2D colorTex ) {
			vec2 threshold = vec2( SMAA_THRESHOLD, SMAA_THRESHOLD );

			// Calculate color deltas:
			vec4 delta;
			vec3 C = texture2D( colorTex, texcoord ).rgb;

			vec3 Cleft = texture2D( colorTex, offset[0].xy ).rgb;
			vec3 t = abs( C - Cleft );
			delta.x = max( max( t.r, t.g ), t.b );

			vec3 Ctop = texture2D( colorTex, offset[0].zw ).rgb;
			t = abs( C - Ctop );
			delta.y = max( max( t.r, t.g ), t.b );

			// We do the usual threshold:
			vec2 edges = step( threshold, delta.xy );

			// Then discard if there is no edge:
			if ( dot( edges, vec2( 1.0, 1.0 ) ) == 0.0 )
				discard;

			// Calculate right and bottom deltas:
			vec3 Cright = texture2D( colorTex, offset[1].xy ).rgb;
			t = abs( C - Cright );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Cbottom  = texture2D( colorTex, offset[1].zw ).rgb;
			t = abs( C - Cbottom );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the maximum delta in the direct neighborhood:
			float maxDelta = max( max( max( delta.x, delta.y ), delta.z ), delta.w );

			// Calculate left-left and top-top deltas:
			vec3 Cleftleft  = texture2D( colorTex, offset[2].xy ).rgb;
			t = abs( C - Cleftleft );
			delta.z = max( max( t.r, t.g ), t.b );

			vec3 Ctoptop = texture2D( colorTex, offset[2].zw ).rgb;
			t = abs( C - Ctoptop );
			delta.w = max( max( t.r, t.g ), t.b );

			// Calculate the final maximum delta:
			maxDelta = max( max( maxDelta, delta.z ), delta.w );

			// Local contrast adaptation in action:
			edges.xy *= step( 0.5 * maxDelta, delta.xy );

			return vec4( edges, 0.0, 0.0 );
		}

		void main() {

			gl_FragColor = SMAAColorEdgeDetectionPS( vUv, vOffset, tDiffuse );

		}`},gt={name:"SMAAWeightsShader",defines:{SMAA_MAX_SEARCH_STEPS:"8",SMAA_AREATEX_MAX_DISTANCE:"16",SMAA_AREATEX_PIXEL_SIZE:"( 1.0 / vec2( 160.0, 560.0 ) )",SMAA_AREATEX_SUBTEX_SIZE:"( 1.0 / 7.0 )"},uniforms:{tDiffuse:{value:null},tArea:{value:null},tSearch:{value:null},resolution:{value:new we(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 3 ];
		varying vec2 vPixcoord;

		void SMAABlendingWeightCalculationVS( vec2 texcoord ) {
			vPixcoord = texcoord / resolution;

			// We will use these offsets for the searches later on (see @PSEUDO_GATHER4):
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.25, 0.125, 1.25, 0.125 ); // WebGL port note: Changed sign in Y and W components
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( -0.125, 0.25, -0.125, -1.25 ); // WebGL port note: Changed sign in Y and W components

			// And these for the searches, they indicate the ends of the loops:
			vOffset[ 2 ] = vec4( vOffset[ 0 ].xz, vOffset[ 1 ].yw ) + vec4( -2.0, 2.0, -2.0, 2.0 ) * resolution.xxyy * float( SMAA_MAX_SEARCH_STEPS );

		}

		void main() {

			vUv = uv;

			SMAABlendingWeightCalculationVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		#define SMAASampleLevelZeroOffset( tex, coord, offset ) texture2D( tex, coord + float( offset ) * resolution, 0.0 )

		uniform sampler2D tDiffuse;
		uniform sampler2D tArea;
		uniform sampler2D tSearch;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[3];
		varying vec2 vPixcoord;

		#if __VERSION__ == 100
		vec2 round( vec2 x ) {
			return sign( x ) * floor( abs( x ) + 0.5 );
		}
		#endif

		float SMAASearchLength( sampler2D searchTex, vec2 e, float bias, float scale ) {
			// Not required if searchTex accesses are set to point:
			// float2 SEARCH_TEX_PIXEL_SIZE = 1.0 / float2(66.0, 33.0);
			// e = float2(bias, 0.0) + 0.5 * SEARCH_TEX_PIXEL_SIZE +
			//     e * float2(scale, 1.0) * float2(64.0, 32.0) * SEARCH_TEX_PIXEL_SIZE;
			e.r = bias + e.r * scale;
			return 255.0 * texture2D( searchTex, e, 0.0 ).r;
		}

		float SMAASearchXLeft( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			/**
				* @PSEUDO_GATHER4
				* This texcoord has been offset by (-0.25, -0.125) in the vertex shader to
				* sample between edge, thus fetching four edges in a row.
				* Sampling with different offsets in each direction allows to disambiguate
				* which edges are active from the four fetched ones.
				*/
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x > end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			// We correct the previous (-0.25, -0.125) offset we applied:
			texcoord.x += 0.25 * resolution.x;

			// The searches are bias by 1, so adjust the coords accordingly:
			texcoord.x += resolution.x;

			// Disambiguate the length added by the last step:
			texcoord.x += 2.0 * resolution.x; // Undo last step
			texcoord.x -= resolution.x * SMAASearchLength(searchTex, e, 0.0, 0.5);

			return texcoord.x;
		}

		float SMAASearchXRight( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 0.0, 1.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 2.0, 0.0 ) * resolution;
				if ( ! ( texcoord.x < end && e.g > 0.8281 && e.r == 0.0 ) ) break;
			}

			texcoord.x -= 0.25 * resolution.x;
			texcoord.x -= resolution.x;
			texcoord.x -= 2.0 * resolution.x;
			texcoord.x += resolution.x * SMAASearchLength( searchTex, e, 0.5, 0.5 );

			return texcoord.x;
		}

		float SMAASearchYUp( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord += vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y > end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y -= 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y; // WebGL port note: Changed sign
			texcoord.y -= 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y * SMAASearchLength( searchTex, e.gr, 0.0, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		float SMAASearchYDown( sampler2D edgesTex, sampler2D searchTex, vec2 texcoord, float end ) {
			vec2 e = vec2( 1.0, 0.0 );

			for ( int i = 0; i < SMAA_MAX_SEARCH_STEPS; i ++ ) { // WebGL port note: Changed while to for
				e = texture2D( edgesTex, texcoord, 0.0 ).rg;
				texcoord -= vec2( 0.0, 2.0 ) * resolution; // WebGL port note: Changed sign
				if ( ! ( texcoord.y < end && e.r > 0.8281 && e.g == 0.0 ) ) break;
			}

			texcoord.y += 0.25 * resolution.y; // WebGL port note: Changed sign
			texcoord.y += resolution.y; // WebGL port note: Changed sign
			texcoord.y += 2.0 * resolution.y; // WebGL port note: Changed sign
			texcoord.y -= resolution.y * SMAASearchLength( searchTex, e.gr, 0.5, 0.5 ); // WebGL port note: Changed sign

			return texcoord.y;
		}

		vec2 SMAAArea( sampler2D areaTex, vec2 dist, float e1, float e2, float offset ) {
			// Rounding prevents precision errors of bilinear filtering:
			vec2 texcoord = float( SMAA_AREATEX_MAX_DISTANCE ) * round( 4.0 * vec2( e1, e2 ) ) + dist;

			// We do a scale and bias for mapping to texel space:
			texcoord = SMAA_AREATEX_PIXEL_SIZE * texcoord + ( 0.5 * SMAA_AREATEX_PIXEL_SIZE );

			// Move to proper place, according to the subpixel offset:
			texcoord.y += SMAA_AREATEX_SUBTEX_SIZE * offset;

			return texture2D( areaTex, texcoord, 0.0 ).rg;
		}

		vec4 SMAABlendingWeightCalculationPS( vec2 texcoord, vec2 pixcoord, vec4 offset[ 3 ], sampler2D edgesTex, sampler2D areaTex, sampler2D searchTex, ivec4 subsampleIndices ) {
			vec4 weights = vec4( 0.0, 0.0, 0.0, 0.0 );

			vec2 e = texture2D( edgesTex, texcoord ).rg;

			if ( e.g > 0.0 ) { // Edge at north
				vec2 d;

				// Find the distance to the left:
				vec2 coords;
				coords.x = SMAASearchXLeft( edgesTex, searchTex, offset[ 0 ].xy, offset[ 2 ].x );
				coords.y = offset[ 1 ].y; // offset[1].y = texcoord.y - 0.25 * resolution.y (@CROSSING_OFFSET)
				d.x = coords.x;

				// Now fetch the left crossing edges, two at a time using bilinear
				// filtering. Sampling at -0.25 (see @CROSSING_OFFSET) enables to
				// discern what value each edge has:
				float e1 = texture2D( edgesTex, coords, 0.0 ).r;

				// Find the distance to the right:
				coords.x = SMAASearchXRight( edgesTex, searchTex, offset[ 0 ].zw, offset[ 2 ].y );
				d.y = coords.x;

				// We want the distances to be in pixel units (doing this here allow to
				// better interleave arithmetic and memory accesses):
				d = d / resolution.x - pixcoord.x;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the right crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 1, 0 ) ).r;

				// Ok, we know how this pattern looks like, now it is time for getting
				// the actual area:
				weights.rg = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.y ) );
			}

			if ( e.r > 0.0 ) { // Edge at west
				vec2 d;

				// Find the distance to the top:
				vec2 coords;

				coords.y = SMAASearchYUp( edgesTex, searchTex, offset[ 1 ].xy, offset[ 2 ].z );
				coords.x = offset[ 0 ].x; // offset[1].x = texcoord.x - 0.25 * resolution.x;
				d.x = coords.y;

				// Fetch the top crossing edges:
				float e1 = texture2D( edgesTex, coords, 0.0 ).g;

				// Find the distance to the bottom:
				coords.y = SMAASearchYDown( edgesTex, searchTex, offset[ 1 ].zw, offset[ 2 ].w );
				d.y = coords.y;

				// We want the distances to be in pixel units:
				d = d / resolution.y - pixcoord.y;

				// SMAAArea below needs a sqrt, as the areas texture is compressed
				// quadratically:
				vec2 sqrt_d = sqrt( abs( d ) );

				// Fetch the bottom crossing edges:
				coords.y -= 1.0 * resolution.y; // WebGL port note: Added
				float e2 = SMAASampleLevelZeroOffset( edgesTex, coords, ivec2( 0, 1 ) ).g;

				// Get the area for this direction:
				weights.ba = SMAAArea( areaTex, sqrt_d, e1, e2, float( subsampleIndices.x ) );
			}

			return weights;
		}

		void main() {

			gl_FragColor = SMAABlendingWeightCalculationPS( vUv, vPixcoord, vOffset, tDiffuse, tArea, tSearch, ivec4( 0.0 ) );

		}`},Bt={name:"SMAABlendShader",uniforms:{tDiffuse:{value:null},tColor:{value:null},resolution:{value:new we(1/1024,1/512)}},vertexShader:`

		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		void SMAANeighborhoodBlendingVS( vec2 texcoord ) {
			vOffset[ 0 ] = texcoord.xyxy + resolution.xyxy * vec4( -1.0, 0.0, 0.0, 1.0 ); // WebGL port note: Changed sign in W component
			vOffset[ 1 ] = texcoord.xyxy + resolution.xyxy * vec4( 1.0, 0.0, 0.0, -1.0 ); // WebGL port note: Changed sign in W component
		}

		void main() {

			vUv = uv;

			SMAANeighborhoodBlendingVS( vUv );

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,fragmentShader:`

		uniform sampler2D tDiffuse;
		uniform sampler2D tColor;
		uniform vec2 resolution;

		varying vec2 vUv;
		varying vec4 vOffset[ 2 ];

		vec4 SMAANeighborhoodBlendingPS( vec2 texcoord, vec4 offset[ 2 ], sampler2D colorTex, sampler2D blendTex ) {
			// Fetch the blending weights for current pixel:
			vec4 a;
			a.xz = texture2D( blendTex, texcoord ).xz;
			a.y = texture2D( blendTex, offset[ 1 ].zw ).g;
			a.w = texture2D( blendTex, offset[ 1 ].xy ).a;

			// Is there any blending weight with a value greater than 0.0?
			if ( dot(a, vec4( 1.0, 1.0, 1.0, 1.0 )) < 1e-5 ) {
				return texture2D( colorTex, texcoord, 0.0 );
			} else {
				// Up to 4 lines can be crossing a pixel (one through each edge). We
				// favor blending by choosing the line with the maximum weight for each
				// direction:
				vec2 offset;
				offset.x = a.a > a.b ? a.a : -a.b; // left vs. right
				offset.y = a.g > a.r ? -a.g : a.r; // top vs. bottom // WebGL port note: Changed signs

				// Then we go in the direction that has the maximum weight:
				if ( abs( offset.x ) > abs( offset.y )) { // horizontal vs. vertical
					offset.y = 0.0;
				} else {
					offset.x = 0.0;
				}

				// Fetch the opposite color and lerp by hand:
				vec4 C = texture2D( colorTex, texcoord, 0.0 );
				texcoord += sign( offset ) * resolution;
				vec4 Cop = texture2D( colorTex, texcoord, 0.0 );
				float s = abs( offset.x ) > abs( offset.y ) ? abs( offset.x ) : abs( offset.y );

				// WebGL port note: Added gamma correction
				C.xyz = pow(C.xyz, vec3(2.2));
				Cop.xyz = pow(Cop.xyz, vec3(2.2));
				vec4 mixed = mix(C, Cop, s);
				mixed.xyz = pow(mixed.xyz, vec3(1.0 / 2.2));

				return mixed;
			}
		}

		void main() {

			gl_FragColor = SMAANeighborhoodBlendingPS( vUv, vOffset, tColor, tDiffuse );

		}`};var Ot=class extends fe{constructor(){super(),this._edgesRT=new ye(1,1,{depthBuffer:!1,type:be}),this._edgesRT.texture.name="SMAAPass.edges",this._weightsRT=new ye(1,1,{depthBuffer:!1,type:be}),this._weightsRT.texture.name="SMAAPass.weights";let e=this,r=new Image;r.src=this._getAreaTexture(),r.onload=function(){e._areaTexture.needsUpdate=!0},this._areaTexture=new Vt,this._areaTexture.name="SMAAPass.area",this._areaTexture.image=r,this._areaTexture.minFilter=yo,this._areaTexture.generateMipmaps=!1,this._areaTexture.flipY=!1;let m=new Image;m.src=this._getSearchTexture(),m.onload=function(){e._searchTexture.needsUpdate=!0},this._searchTexture=new Vt,this._searchTexture.name="SMAAPass.search",this._searchTexture.image=m,this._searchTexture.magFilter=it,this._searchTexture.minFilter=it,this._searchTexture.generateMipmaps=!1,this._searchTexture.flipY=!1,this._uniformsEdges=ce.clone(xt.uniforms),this._materialEdges=new q({defines:Object.assign({},xt.defines),uniforms:this._uniformsEdges,vertexShader:xt.vertexShader,fragmentShader:xt.fragmentShader}),this._uniformsWeights=ce.clone(gt.uniforms),this._uniformsWeights.tDiffuse.value=this._edgesRT.texture,this._uniformsWeights.tArea.value=this._areaTexture,this._uniformsWeights.tSearch.value=this._searchTexture,this._materialWeights=new q({defines:Object.assign({},gt.defines),uniforms:this._uniformsWeights,vertexShader:gt.vertexShader,fragmentShader:gt.fragmentShader}),this._uniformsBlend=ce.clone(Bt.uniforms),this._uniformsBlend.tDiffuse.value=this._weightsRT.texture,this._materialBlend=new q({uniforms:this._uniformsBlend,vertexShader:Bt.vertexShader,fragmentShader:Bt.fragmentShader}),this._fsQuad=new Pe(null)}render(e,r,m){this._uniformsEdges.tDiffuse.value=m.texture,this._fsQuad.material=this._materialEdges,e.setRenderTarget(this._edgesRT),this.clear&&e.clear(),this._fsQuad.render(e),this._fsQuad.material=this._materialWeights,e.setRenderTarget(this._weightsRT),this.clear&&e.clear(),this._fsQuad.render(e),this._uniformsBlend.tColor.value=m.texture,this._fsQuad.material=this._materialBlend,this.renderToScreen?(e.setRenderTarget(null),this._fsQuad.render(e)):(e.setRenderTarget(r),this.clear&&e.clear(),this._fsQuad.render(e))}setSize(e,r){this._edgesRT.setSize(e,r),this._weightsRT.setSize(e,r),this._materialEdges.uniforms.resolution.value.set(1/e,1/r),this._materialWeights.uniforms.resolution.value.set(1/e,1/r),this._materialBlend.uniforms.resolution.value.set(1/e,1/r)}dispose(){this._edgesRT.dispose(),this._weightsRT.dispose(),this._areaTexture.dispose(),this._searchTexture.dispose(),this._materialEdges.dispose(),this._materialWeights.dispose(),this._materialBlend.dispose(),this._fsQuad.dispose()}_getAreaTexture(){return"data:image/png;base64,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"}_getSearchTexture(){return"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEIAAAAhCAAAAABIXyLAAAAAOElEQVRIx2NgGAWjYBSMglEwEICREYRgFBZBqDCSLA2MGPUIVQETE9iNUAqLR5gIeoQKRgwXjwAAGn4AtaFeYLEAAAAASUVORK5CYII="}};async function _a({scene:x,camera:e,renderer:r,loader:m,architecture:E,art:T,sun:H,hemi:k,mobile:R}){let[Me,pe,Se]=await Promise.all([m.loadAsync("textures/water-normal.webp"),fetch("handoff/lighting.json").then(t=>t.json()),m.loadAsync("textures/plaster.webp")]);Me.wrapS=Me.wrapT=At;let K=No({scene:x,architecture:E,sun:H,hemi:k,renderer:r,mobile:R,plasterTexture:Se,art:T});K.sky.visible=!1,K.mirrorHidden.forEach(t=>{t.userData.kill=!0,t.visible=!1}),x.fog=new So(1712180,.02);let ue={...Je.ReflectorShader,uniforms:ce.clone(Je.ReflectorShader.uniforms)},Ce=16,Ee=Array.from({length:Ce},()=>new Be(1e3,1e3,-100,0));Object.assign(ue.uniforms,{normalMap:{value:Me},time:{value:0},ripples:{value:Ee},uCur:{value:new N(1e3,0,1e3)},stir:{value:0},hazeColor:{value:new V(66e4)}}),ue.vertexShader=`varying vec2 waterUV;varying vec2 waterWorld;
`+ue.vertexShader.replace("void main() {","void main() {waterUV=position.xy/3.;waterWorld=(modelMatrix*vec4(position,1.)).xz;"),ue.fragmentShader=`uniform sampler2D normalMap;uniform float time;uniform float stir;uniform vec3 hazeColor;uniform vec4 ripples[16];uniform vec3 uCur;varying vec2 waterUV;varying vec2 waterWorld;
`+ue.fragmentShader,ue.fragmentShader=ue.fragmentShader.replace("vec4 base = texture2DProj( tDiffuse, vUv );",`vec2 n=texture2D(normalMap,waterUV+vec2(time*.006,time*.003)).rg*2.-1.;
 n+=texture2D(normalMap,waterUV*1.37-vec2(time*.004,time*.005)).rg*2.-1.;
 float camD=length(cameraPosition.xz-waterWorld);float far=smoothstep(5.,26.,camD);n+=(texture2D(normalMap,waterUV*3.1+vec2(time*.021,-time*.017)).rg*1.4-.7)*(1.-far);n*=(.8+stir*1.4)*mix(1.,.45,far);
 n*=.7;/* calmer surface: waves 30% softer */vec2 nr=vec2(0.);float crest=0.;for(int i=0;i<16;i++){vec2 d=waterWorld-ripples[i].xy;float age=time-ripples[i].z;float r=length(d);float env=exp(-pow((r-age*1.9)*.22,2.))*exp(-age*.3)*step(0.,age)*ripples[i].w;float wave=sin(r*1.05-age*2.4)*env;nr+=normalize(d+vec2(.001))*wave;crest+=max(wave,0.)*env;}
 vec4 q=vUv;float wob=sin(waterWorld.y*1.6+time*.9+n.x*1.5)*.6+sin(waterWorld.y*3.3-time*1.3+n.y*2.)*.4;q.xy+=(vec2(n.x*.007+wob*.012,n.y*.022)+nr*.09)*q.w;vec2 uv=q.xy/q.w;vec2 blur=vec2(.0016,.0034)*(1.+stir*.5);vec4 base=vec4(0.);float wsum=0.;for(int k=0;k<8;k++){float fk=float(k);float rr=sqrt((fk+.5)/8.);float aa=fk*2.39996;float w=1.-rr*.6;base+=texture2D(tDiffuse,uv+vec2(cos(aa),sin(aa))*rr*blur)*w;wsum+=w;}base/=wsum;
 vec3 toEye=cameraPosition-vec3(waterWorld.x,.025,waterWorld.y);float fresnel=pow(1.-clamp(abs(toEye.y)/length(toEye),0.,1.),4.);
 // murky pond water: drifting silt clouds + depth tint, reflections only win at grazing angles
 vec2 sp=waterWorld*.18+vec2(time*.012,-time*.008);float silt=texture2D(normalMap,sp).b*.6+texture2D(normalMap,sp*2.3+.37).b*.4;
 float sediment=smoothstep(.25,.85,silt);vec3 waterBody=mix(vec3(.026,.025,.027),vec3(.034,.031,.03),sediment);
 waterBody+=vec3(.008,.007,.006)*(1.-fresnel);
 base.rgb=mix(waterBody,base.rgb*vec3(1.25,1.22,1.18),.8+.19*fresnel);{float ex=abs(waterWorld.x);base.rgb=mix(base.rgb,waterBody*.6,smoothstep(3.55,3.98,ex)*.92*step(-72.6,waterWorld.y));}   float csLine=0.;{vec2 cw=(waterWorld+nr*.9)*vec2(.9,.6);float r1=texture2D(normalMap,cw*.22+vec2(time*.011,time*.007)).r-texture2D(normalMap,cw*.31-vec2(time*.009,-time*.012)).g;float r2=texture2D(normalMap,cw*.5+vec2(-time*.016,time*.01)).b-texture2D(normalMap,cw*.43+vec2(time*.013,time*.015)).r;float cs=pow(1.-smoothstep(0.,.05,abs(r1)),5.)*.65+pow(1.-smoothstep(0.,.04,abs(r2)),5.)*.35;cs*=smoothstep(.35,.75,texture2D(normalMap,cw*.07+time*.004).b);float near=exp(-length(cameraPosition.xz-waterWorld)*.07);csLine=cs;base.rgb+=vec3(.9,.82,.7)*cs*(.1*near);}
 // haze sitting on the surface, thicker with distance
 float dist=length(toEye);{float ph=(nr.x*3.+nr.y*2.)*4.+time*.8+length(nr)*6.;vec3 iri=vec3(1.,.97,.92)*(.85+.15*cos(ph));float wk=clamp(length(nr)*3.,0.,1.);base.rgb=mix(base.rgb,base.rgb*1.1+iri*.06,wk*.5);base.rgb+=iri*crest*.45;base.rgb=max(base.rgb,vec3(0.));}
 {float cd=length(waterWorld-uCur.xz);float cf=exp(-cd*cd*1.1)*uCur.y;  // under the cursor only the wave lines light up (to white); the water itself stays dark
 float ln=smoothstep(.02,.7,csLine);base.rgb+=vec3(.95,.97,1.)*ln*cf*.8;}float haze=1.-exp(-dist*.012);base.rgb=mix(base.rgb,hazeColor,haze*.12);`);{let t=(i,p)=>{let f=Math.sin(i*91.7+p*13.1)*43758.5;return f-Math.floor(f)},s=(i,p,f,M)=>{let y=new de(1,1,4,10),h=y.attributes.position,a=[],n=new V(1,.86,.62),B=new V(.96,.62,.72),X=new V(.86,.34,.52),b=new V;for(let z=0;z<h.count;z++){let C=h.getX(z),v=h.getY(z)+.5,D=Math.pow(Math.sin(Math.PI*Math.min(1,v*.92+.04)),.75)*(1-v*.25)*p,A=C*2*D,ne=M*v*v,I=Math.sin(ne)*i*v*0+i*v*Math.cos(ne*.5),O=-f*(C*2)*(C*2)*D+i*v*Math.sin(ne*.5)*0;h.setXYZ(z,A,I,-f*(C*2)*(C*2)*D*1.2-M*i*v*v*.35),v<.5?b.copy(n).lerp(B,v*2):b.copy(B).lerp(X,(v-.5)*2),b.offsetHSL(0,0,Math.abs(C)*-.06),a.push(b.r,b.g,b.b)}return y.setAttribute("color",new Oe(a,3)),y.deleteAttribute("uv"),y.computeVertexNormals(),y},u=[],g=[],c=(i,p,f,M)=>{[[11,.32,.32,.1,.06,.3],[10,.78,.32,.095,.09,.2],[9,1.12,.28,.085,.1,.1],[7,1.36,.21,.07,.1,0]].forEach(([a,n,B,X,b,z],C)=>{for(let v=0;v<a;v++){let D=s(B,X,b,z);D.rotateX(Math.PI/2-n),D.rotateY(v/a*Math.PI*2+C*.37+M),D.translate(0,.01+C*.012,0),D.scale(f,f,f),D.translate(i,.05,p),u.push(D)}});let y=new It(.05*f,.04*f,.04*f,14),h=[];for(let a=0;a<y.attributes.position.count;a++)h.push(1,.72,.2);y.setAttribute("color",new Oe(h,3)),y.deleteAttribute("uv"),y.translate(i,.08*f+.05,p),u.push(y);for(let a=0;a<18;a++){let n=new Ke(.006*f,.05*f,.006*f),B=[];for(let b=0;b<n.attributes.position.count;b++)B.push(1,.8,.3);n.setAttribute("color",new Oe(B,3)),n.deleteAttribute("uv");let X=a/18*Math.PI*2;n.rotateZ(.35),n.rotateY(-X),n.translate(i+Math.cos(X)*.045*f,.1*f+.05,p+Math.sin(X)*.045*f),u.push(n)}},w=(i,p,f,M,y)=>{let h=new Dt(f,40,.12,Math.PI*2-.24),a=h.attributes.position;for(let n=0;n<a.count;n++){let B=a.getX(n),X=a.getY(n),b=Math.hypot(B,X)/f;a.setZ(n,Math.pow(b,6)*.018+Math.sin(Math.atan2(X,B)*5+M)*.004*b)}h.rotateX(-Math.PI/2),h.rotateY(M),h.translate(i,y,p),g.push(h)},F=[[-2.6,-9],[2.8,-15],[-3.1,-23],[1.9,-30],[-2.2,-37],[3.2,-44],[-2.9,-51],[2.4,-58],[-3.3,-62.5],[3.4,-66.5]];F.forEach(([i,p],f)=>{let M=3+Math.floor(t(f,1)*3);for(let y=0;y<M;y++){let h=t(f,y+2)*6.28,a=y?.35+t(f,y+9)*.45:0;w(i+Math.cos(h)*a,p+Math.sin(h)*a,.26+t(f,y+5)*.2,t(f,y+7)*6.28,.036+y*.0015)}t(f,3)>.25&&c(i+(t(f,4)-.5)*.15,p+(t(f,6)-.5)*.15,1.05+t(f,8)*.35,t(f,11)*6.28)}),u.forEach(i=>{i.attributes.normal&&i.deleteAttribute("normal")});let U=zt(u);U.computeVertexNormals();let Y=zt(g);Y.computeVertexNormals();let J=new ze({color:2771500,roughness:.28,metalness:0,side:ie,emissive:726540,emissiveIntensity:1});J.onBeforeCompile=i=>{i.fragmentShader=i.fragmentShader.replace("#include <map_fragment>",`#include <map_fragment>
    {vec2 q=vUv-.5;float r=length(q)*2.;float a=atan(q.y,q.x);float vein=pow(abs(sin(a*11.)),60.)*smoothstep(.1,.9,r);float rim=smoothstep(.86,1.,r);diffuseColor.rgb*=mix(vec3(.85,.95,.8),vec3(1.25,1.2,.95),vein*.7)*(1.-rim*.45)*(.85+.3*fract(sin(dot(floor(q*40.),vec2(12.9,78.2)))*43758.5)*.3);}`),i.vertexShader=i.vertexShader.replace("#include <uv_vertex>",`#include <uv_vertex>
vUv=uv;`),i.fragmentShader=`varying vec2 vUv;
`+i.fragmentShader,i.vertexShader=`varying vec2 vUv;
`+i.vertexShader};let j=new G(Y,J),oe=new G(U,new ze({vertexColors:!0,roughness:.5,side:ie,emissive:16777215,emissiveIntensity:.22}));oe.material.onBeforeCompile=i=>{i.fragmentShader=i.fragmentShader.replace("#include <clipping_planes_fragment>",`#include <clipping_planes_fragment>
{float nd=smoothstep(.7,1.6,length(vViewPosition));if(nd<fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453))discard;}`),i.fragmentShader=i.fragmentShader.replace("#include <emissivemap_fragment>",`#include <emissivemap_fragment>
totalEmissiveRadiance*=vColor.rgb*vColor.rgb;`)};let o=new Qe(16756848,0,0);o.visible=!1,Promise.all(["lily-flower","lily-flower2","lily-pad","lily-pad2"].map(i=>m.loadAsync("assets/"+i+".webp"))).then(([i,p,f,M])=>{[i,p,f,M].forEach(v=>{v.colorSpace=Re,v.anisotropy=8});let y=v=>new Fe({map:v,alphaTest:.3,alphaToCoverage:!0,side:ie,color:new V(.62,.58,.62)}),h=v=>new Fe({map:v,alphaTest:.3,alphaToCoverage:!0,side:ie,color:new V(.5,.52,.5)}),a=[y(i),y(p)],n=[h(f),h(M)],B=new Do({map:(()=>{let v=document.createElement("canvas");v.width=v.height=64;let D=v.getContext("2d"),A=D.createRadialGradient(32,32,0,32,32,32);return A.addColorStop(0,"rgba(255,170,205,.35)"),A.addColorStop(1,"rgba(255,170,205,0)"),D.fillStyle=A,D.fillRect(0,0,64,64),new rt(v)})(),blending:at,depthWrite:!1,transparent:!0,opacity:.5}),X=new de(1.17,1).translate(0,.5,0),b=new de(1,1).rotateX(-Math.PI/2),z=[],C=[];F.forEach(([v,D],A)=>{let ne=C.length,I=3+Math.floor(t(A,1)*3);for(let O=0;O<I;O++){let d=t(A,O+2)*6.28,S=O?.35+t(A,O+9)*.45:0,P=(.26+t(A,O+5)*.2)*1.7,L=new G(b,n[(A+O)%2]);L.scale.set(P,1,P),L.rotation.y=t(A,O+7)*6.28,L.position.set(v+Math.cos(d)*S,.03+C.length%7*.0035+O*.0011,D+Math.sin(d)*S),L.renderOrder=C.length,L.userData.y0=L.position.y,L.userData.ph=t(A,13)*6.28,L.userData.spot=A,L.userData.home=L.position.clone(),L.userData.v=new we,L.userData.av=0,C.push(L),x.add(L)}if(t(A,3)>.25){let O=.4+t(A,8)*.12,d=new G(X,a[A%2]);d.scale.set(O,O,O),d.position.set(v+(t(A,4)-.5)*.15,0,D+(t(A,6)-.5)*.15),d.userData.ph=t(A,15)*6.28,d.userData.pad=C[ne],d.userData.off=new we(d.position.x-C[ne].position.x,d.position.z-C[ne].position.z),z.push(d),x.add(d);let S=new zo(B);S.scale.set(.75,.5,1),S.position.set(0,.45,0),d.add(S)}}),j.visible=!1,oe.visible=!1,window.__lilyCards={lilyCards:z,padCards:C};{let v=new N;z.forEach(D=>D.userData.s0=D.scale.x),C.forEach(D=>D.userData.s0=D.scale.x),(function D(){requestAnimationFrame(D);for(let A of z){A.getWorldPosition(v);let ne=v.distanceTo(e.position),I=Math.min(1,Math.max(0,(ne-1.1)/1.6)),O=I*I*(3-2*I);O<1&&(A.scale.setScalar(A.userData.s0*O),A.visible=O>.01)}for(let A of C){let ne=A.position.distanceTo(e.position),I=Math.min(1,Math.max(0,(ne-.9)/1.2)),O=I*I*(3-2*I);O<1&&(A.scale.set(A.userData.s0*O,1,A.userData.s0*O),A.visible=O>.01)}})()}}).catch(()=>{}),x.add(j,oe)}let _=new Dt(1,80);_.scale(11.2,6.2,1),_.translate(0,42.7,0);let re=()=>[Math.max(480,Math.min(1440,Math.round(innerWidth*(R?.5:.75)))),Math.max(270,Math.min(810,Math.round(innerHeight*(R?.5:.75))))],Z=new Je(zt([new de(8,71.62).translate(0,-.19,0),_]),{shader:ue,textureWidth:re()[0],textureHeight:re()[1],multisample:0,color:9209208,clipBias:.003});Z.rotation.x=-Math.PI/2,Z.position.set(0,.025,-37),x.add(Z),K.mirrorHidden?.forEach(t=>{});let te=!1,Ae=Z.onBeforeRender,Ue=[...K.mirrorHidden||[]],Ne=0;Z.onBeforeRender=function(...t){R&&Ne++%3!==0&&te||(Ue.forEach(s=>{s.userData.v=s.visible,s.visible=!1}),Ae.apply(this,t),Ue.forEach(s=>{s.visible=s.userData.v&&s!==K.sky&&!s.userData.kill}),te=!0,Ge(t[0]))};let W=[0,1].map(()=>new ye(...re(),{type:be})),ae=0,me=!0,Q=new q({uniforms:{cur:{value:null},prev:{value:null},k:{value:.4}},depthTest:!1,depthWrite:!1,vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}",fragmentShader:"uniform sampler2D cur;uniform sampler2D prev;uniform float k;varying vec2 vUv;void main(){vec2 px=vec2(1.)/vec2(textureSize(cur,0));vec4 c=texture2D(cur,vUv)*.4+(texture2D(cur,vUv+vec2(px.x,0.))+texture2D(cur,vUv-vec2(px.x,0.))+texture2D(cur,vUv+vec2(0.,px.y))+texture2D(cur,vUv-vec2(0.,px.y)))*.15;gl_FragColor=mix(texture2D(prev,vUv),c,k);}"}),wt=new Ao,$=new Wo;wt.add(new G(new de(2,2),Q));let nt=new N;function Ge(t){let s=Z.getRenderTarget(),u=W[ae],g=W[1-ae],c=e.position.distanceTo(nt);nt.copy(e.position),Q.uniforms.cur.value=s.texture,Q.uniforms.prev.value=g.texture,Q.uniforms.k.value=me?1:je(c),me=!1;let w=t.getRenderTarget();t.setRenderTarget(u),t.render(wt,$),t.setRenderTarget(w),Z.material.uniforms.tDiffuse.value=u.texture,ae=1-ae}let je=t=>window.__hpId!=null&&window.__hpId!==-1||document.body.dataset.view==="painting"?1:Math.min(1,.55+t*2),l=await m.loadAsync("assets/figmatranh.png");l.colorSpace=Re;let lilB=await m.loadAsync("assets/lilies-2048.webp");lilB.colorSpace=Re;{let F=6.5*(l.image.width/l.image.height),U=[],Y=0,J=null;for(let h=0;h<=720;h++){let a=Math.PI+h/720*Math.PI,n=[12.15*Math.cos(a),6.6*Math.sin(a)];J&&(Y+=Math.hypot(n[0]-J[0],n[1]-J[1])),U.push([a,Y]),J=n}let j=Y/2,oe=j-F/2,o=j+F/2,i=h=>{for(let a=1;a<U.length;a++)if(U[a][1]>=h){let n=(h-U[a-1][1])/(U[a][1]-U[a-1][1]);return U[a-1][0]+(U[a][0]-U[a-1][0])*n}return U[U.length-1][0]},p=(h,a,n,B,X,b,z,C)=>{let v=[],D=[],A=[];for(let d=0;d<=96;d++){let S=i(h+(a-h)*d/96);for(let P of[n,B])v.push((12.15-C)*Math.cos(S),P,-79.73+(6.6-C)*Math.sin(S)),D.push(X+(b-X)*d/96,(P-n)/(B-n));if(d<96){let P=d*2;A.push(P,P+1,P+2,P+1,P+3,P+2)}}let I=new ut;I.setAttribute("position",new Oe(v,3)),I.setAttribute("uv",new Oe(D,2)),I.setIndex(A),I.computeVertexNormals();let O=new G(I,z);return x.add(O),O};l.wrapS=l.wrapT=wo,l.anisotropy=r.capabilities.getMaxAnisotropy();let f=new Fe({map:l,side:ie,toneMapped:!1}),M={value:0},lilMx={value:0},lilK=(l.image.width/l.image.height)/(lilB.image.width/lilB.image.height);(function h(a){M.value=window.__lilTime??a/1e3;{let cz=window.__monet?.camera?.position.z??0,q=Math.min(1,Math.max(0,(-71.6-cz)/2));lilMx.value=q*q*(3-2*q)}requestAnimationFrame(h)})(0),f.onBeforeCompile=h=>{h.uniforms.uLT=M,h.uniforms.uLilB={value:lilB},h.uniforms.uLilMx=lilMx,h.vertexShader=`varying vec2 lUv;
`+h.vertexShader.replace("void main() {","void main() {lUv=uv;"),h.fragmentShader=`uniform float uLT;uniform sampler2D uLilB;uniform float uLilMx;varying vec2 lUv;
`+h.fragmentShader.replace("#include <map_fragment>","vec2 lq=vMapUv;float wa=smoothstep(.28,.62,lUv.y),re=1.-wa;float t=uLT;lq.x+=(sin(lUv.y*7.+t*.35)*.0045+sin(lUv.y*41.+t*1.15)*.0016+sin(lUv.y*83.-t*1.9)*.0008)*wa;lq.y+=(sin(lUv.x*29.+t*.9)*.0022+sin(lUv.x*67.-t*1.4)*.0009)*wa;lq.x+=sin(lUv.y*120.+t*2.1+lUv.x*9.)*.0016*re*(1.2-lUv.y);vec2 lb=lilK<1.?vec2(.5+(lq.x-.5)*lilK,lq.y):vec2(lq.x,.5+(lq.y-.5)/lilK);vec4 sampledDiffuseColor=mix(texture2D(uLilB,lb),vec4(0.,0.,0.,1.),uLilMx);diffuseColor*=sampledDiffuseColor;".replace(/lilK/g,lilK.toFixed(5))),h.fragmentShader=h.fragmentShader.replace("#include <dithering_fragment>","#include <dithering_fragment>"),h.fragmentShader=h.fragmentShader.replace("diffuseColor*=sampledDiffuseColor;",`diffuseColor*=sampledDiffuseColor;
 diffuseColor.rgb*=mix(.62,1.12,smoothstep(0.,1.,lUv.y))*mix(.8,1.,smoothstep(0.,.12,min(lUv.x,1.-lUv.x)));`)},p(oe-.06,o+.06,.2-.06,.2+6.5+.06,0,1,new Fe({color:9070128,side:ie}),.06);let y=p(oe,o,.2,.2+6.5,0,1,f,.1)}let Le="M 483.28 395.80 Z M 501.64 390.46 C 505.42 392.68 508.98 394.35 512.21 395.02 L 512.21 395.80 L 484.95 395.80 L 484.95 395.02 C 488.18 394.35 491.74 392.68 495.52 390.46 L 495.52 326.03 L 484.95 326.03 L 484.95 325.14 C 490.51 324.25 496.75 320.80 500.86 316.80 L 501.64 316.80 Z M 512.73 395.80 Z M 540.43 397.35 C 526.08 397.35 516.62 381.44 516.62 356.52 C 516.62 331.71 527.53 316.35 541.88 316.35 C 556.12 316.35 565.58 332.15 565.58 356.96 C 565.58 381.89 554.79 397.35 540.43 397.35 Z M 544.22 395.13 C 553.45 395.13 559.24 383.00 559.24 363.08 C 559.24 337.38 551.00 318.58 538.10 318.58 C 528.98 318.58 523.19 330.71 523.19 350.51 C 523.19 375.88 531.42 395.13 544.22 395.13 Z M 569.45 395.80 Z M 597.16 397.35 C 582.80 397.35 573.34 381.44 573.34 356.52 C 573.34 331.71 584.25 316.35 598.60 316.35 C 612.84 316.35 622.30 332.15 622.30 356.96 C 622.30 381.89 611.51 397.35 597.16 397.35 Z M 600.94 395.13 C 610.17 395.13 615.96 383.00 615.96 363.08 C 615.96 337.38 607.73 318.58 594.82 318.58 C 585.69 318.58 579.91 330.71 579.91 350.51 C 579.91 375.88 588.14 395.13 600.94 395.13 Z M 655.07 395.80 Z M 701.80 344.61 L 686.12 371.43 L 686.00 371.43 L 686.00 390.34 C 690.12 392.68 694.01 394.35 697.58 395.02 L 697.58 395.80 L 668.09 395.80 L 668.09 395.02 C 671.65 394.35 675.55 392.68 679.66 390.34 L 679.66 371.43 L 679.55 371.43 L 658.75 323.36 C 655.30 321.03 651.96 319.35 648.95 318.69 L 648.95 317.91 L 676.21 317.91 L 676.21 318.69 C 672.76 319.35 668.98 320.91 664.98 323.14 L 685.23 369.98 L 697.69 347.51 C 705.03 334.26 700.91 320.36 689.01 320.36 C 681.22 320.36 679 326.03 678.55 333.60 L 677.66 333.60 C 677.33 321.80 683.56 316.35 692.68 316.35 C 706.48 316.35 711.15 328.59 701.80 344.61 Z M 708.97 395.80 Z M 787.75 364.53 L 788.64 364.53 C 789.41 381.55 775.73 397.35 753.03 397.35 C 729.55 397.35 712.30 380 712.30 356.74 C 712.30 333.71 729.77 316.35 752.81 316.35 C 768.94 316.35 783.85 325.03 783.85 338.60 C 783.85 348.40 775.84 355.85 767.27 355.85 C 748.13 355.85 747.46 328.48 731.55 328.48 C 728.33 328.48 725.77 329.48 723.21 332.15 C 720.32 337.16 718.87 343.50 718.87 350.51 C 718.87 372.43 734.23 392.35 756.81 392.35 C 774.62 392.35 787.75 379.89 787.75 364.53 Z M 747.02 319.80 C 737.23 319.80 730 323.25 725.32 329.15 C 727.88 327.59 729.77 327.03 732.56 327.03 C 748.35 327.03 754.03 350.96 773.50 350.96 C 778.73 350.96 780.85 347.84 780.85 342.83 C 780.85 332.71 763.60 319.80 747.02 319.80 Z M 790.35 395.80 Z M 824.73 323.03 L 845.54 390.57 C 848.88 392.79 852.22 394.35 855.11 395.02 L 855.11 395.80 L 827.85 395.80 L 827.85 395.02 C 831.30 394.35 835.08 392.79 839.09 390.57 L 827.41 352.96 L 807.04 352.96 L 801.70 366.20 C 795.92 380.55 802.59 393.35 814.28 393.35 C 822.07 393.35 824.73 387.67 824.96 380.11 L 825.85 380.11 C 826.07 392.46 819.39 397.35 810.49 397.35 C 797.14 397.35 790.46 386.23 797.81 369.09 L 817.39 323.36 C 812.5 321.03 807.82 319.35 803.59 318.69 L 803.59 317.91 L 837.53 317.91 L 837.53 318.69 C 833.64 319.35 829.30 320.80 824.73 323.03 Z M 818.62 324.25 L 807.60 351.62 L 826.96 351.62 Z M 850.66 395.80 Z M 896.28 384.23 C 900.06 391.90 904.51 393.68 910.96 395.02 L 910.96 395.80 L 899.06 395.80 C 894.50 395.80 893.05 393.35 890.05 386.00 C 885.15 373.88 879.14 359.30 875.14 349.95 C 873.25 345.50 870.91 340.94 868.80 340.94 C 867.91 340.94 867.46 341.50 867.46 344.06 L 867.46 390.46 C 871.13 392.79 874.69 394.35 877.92 395.02 L 877.92 395.80 L 850.66 395.80 L 850.66 395.02 C 853.89 394.35 857.44 392.79 861.12 390.46 L 861.12 323.25 C 857.44 320.91 853.89 319.35 850.66 318.69 L 850.66 317.91 L 881.81 317.91 C 897.39 317.91 901.95 325.81 901.95 335.27 C 901.95 346.39 894.39 355.63 885.15 355.63 C 884.26 355.63 883.48 355.52 882.70 355.30 C 887.49 365.31 892.05 375.43 896.28 384.23 Z M 869.80 339.38 C 874.25 339.5 881.70 351.73 889.38 351.73 C 893.39 351.73 898.50 349.73 898.50 340.61 C 898.50 328.59 887.16 319.25 877.92 319.25 C 871.80 319.25 867.46 321.03 867.46 324.48 L 867.46 340.72 C 867.79 340.05 868.57 339.38 869.80 339.38 Z M 906.51 395.80 Z M 933.21 349.73 C 942.56 357.07 952.24 364.86 952.24 375.32 C 952.24 389.45 942.00 397.35 929.65 397.35 C 923.09 397.35 917.64 395.24 910.96 389.34 L 910.96 368.65 L 911.85 368.65 C 912.85 380 922.20 395.24 933.77 395.24 C 941.00 395.24 946.46 389.12 946.46 380.78 C 946.46 359.19 912.85 351.62 912.85 334.04 C 912.85 323.14 921.75 316.35 933.88 316.35 C 941.00 316.35 951.80 320.80 951.80 332.60 C 951.80 340.72 943.56 349.40 933.21 349.73 Z M 916.30 329.48 C 916.30 336.16 923.31 341.94 931.10 348.17 C 931.77 348.28 932.55 348.40 933.21 348.40 C 941.56 348.40 946.23 343.72 946.23 337.16 C 946.23 327.03 938.11 319.13 928.21 319.13 C 921.64 319.13 916.30 323.47 916.30 329.48 Z M 301.12 484.80 Z M 377.67 405.35 C 391.02 405.35 397.25 416.37 390.24 433.61 L 371.55 479.34 C 375.66 481.68 379.56 483.35 383.23 484.02 L 383.23 484.80 L 353.75 484.80 L 353.75 484.02 C 356.97 483.46 360.64 481.90 364.32 479.90 L 351.07 438.84 L 334.83 479.34 C 338.94 481.68 342.84 483.35 346.51 484.02 L 346.51 484.80 L 317.03 484.80 L 317.03 484.02 C 320.25 483.46 323.92 481.90 327.60 479.90 L 306.23 412.14 C 302.90 409.91 299.56 408.35 296.66 407.69 L 296.66 406.91 L 323.92 406.91 L 323.92 407.69 C 320.48 408.35 316.69 409.91 312.69 412.14 L 333.72 478.23 L 350.07 435.62 L 342.51 412.14 C 339.17 409.91 335.83 408.35 332.94 407.69 L 332.94 406.91 L 360.20 406.91 L 360.20 407.69 C 356.75 408.35 352.96 409.91 349.07 412.14 L 370.43 478.23 L 386.35 436.51 C 391.91 422.04 385.46 409.36 373.77 409.36 C 365.98 409.36 363.31 415.03 363.09 422.60 L 362.20 422.60 C 361.98 410.25 368.76 405.35 377.67 405.35 Z M 396.52 484.80 Z M 413.32 412.25 L 413.32 479.46 C 416.99 481.79 420.55 483.35 423.78 484.02 L 423.78 484.80 L 396.52 484.80 L 396.52 484.02 C 399.75 483.35 403.30 481.79 406.98 479.46 L 406.98 412.25 C 403.30 409.91 399.75 408.35 396.52 407.69 L 396.52 406.91 L 423.78 406.91 L 423.78 407.69 C 420.55 408.35 416.99 409.91 413.32 412.25 Z M 423.79 484.80 Z M 475.31 406.91 L 475.31 434.39 L 474.42 434.39 C 472.53 416.70 467.19 408.25 460.17 408.25 C 456.39 408.25 454.39 409.58 454.39 413.81 L 454.39 479.34 C 458.62 481.68 462.73 483.35 466.52 484.02 L 466.52 484.80 L 435.92 484.80 L 435.92 484.02 C 439.70 483.35 443.82 481.68 448.05 479.34 L 448.05 413.81 C 448.05 409.58 446.05 408.25 442.26 408.25 C 435.25 408.25 429.91 416.70 428.02 434.39 L 427.13 434.39 L 427.13 406.91 Z M 478.66 484.80 Z M 528.62 412.25 L 528.62 479.46 C 532.41 481.79 535.85 483.35 539.08 484.02 L 539.08 484.80 L 511.82 484.80 L 511.82 484.02 C 515.05 483.35 518.61 481.79 522.28 479.57 L 522.28 439.62 L 495.46 439.62 L 495.46 479.46 C 499.14 481.79 502.70 483.35 505.92 484.02 L 505.92 484.80 L 478.66 484.80 L 478.66 484.02 C 481.89 483.35 485.45 481.79 489.12 479.46 L 489.12 412.25 C 485.45 409.91 481.89 408.35 478.66 407.69 L 478.66 406.91 L 505.92 406.91 L 505.92 407.69 C 502.70 408.35 499.14 409.91 495.46 412.25 L 495.46 438.29 L 522.28 438.29 L 522.28 412.14 C 518.61 409.91 515.05 408.35 511.82 407.69 L 511.82 406.91 L 539.08 406.91 L 539.08 407.69 C 535.85 408.35 532.41 409.91 528.62 412.25 Z M 537.45 484.80 Z M 581.29 486.35 C 558.26 486.35 540.79 469 540.79 445.74 C 540.79 422.71 558.26 405.35 581.29 405.35 C 604.43 405.35 621.90 422.71 621.90 445.74 C 621.90 469 604.43 486.35 581.29 486.35 Z M 586.52 483.80 C 603.87 483.80 615.56 470.66 615.56 452.08 C 615.56 428.83 598.42 407.91 576.06 407.91 C 558.81 407.91 547.13 421.04 547.13 439.51 C 547.13 462.43 564.26 483.80 586.52 483.80 Z M 623.62 484.80 Z M 682.70 406.91 L 682.70 407.69 C 679.47 408.35 675.91 409.91 672.24 412.25 L 672.24 479.46 C 675.91 481.79 679.47 483.35 682.70 484.02 L 682.70 484.80 L 665.90 484.80 L 665.90 474.23 C 663.12 478.23 654.88 486.35 646.65 486.35 C 638.08 486.35 633.07 480.23 633.07 470.44 L 633.07 412.25 C 629.29 409.91 625.84 408.35 622.50 407.69 L 622.50 406.91 L 649.87 406.91 L 649.87 407.69 C 646.65 408.35 643.09 409.91 639.42 412.14 L 639.42 468 C 639.42 477.34 644.20 480.23 650.21 480.23 C 655.88 480.23 660.67 478.45 665.90 472.67 L 665.90 412.25 C 662.23 409.91 658.66 408.35 655.44 407.69 L 655.44 406.91 Z M 682.73 484.80 Z M 734.24 406.91 L 734.24 434.39 L 733.35 434.39 C 731.46 416.70 726.12 408.25 719.11 408.25 C 715.33 408.25 713.32 409.58 713.32 413.81 L 713.32 479.34 C 717.55 481.68 721.67 483.35 725.45 484.02 L 725.45 484.80 L 694.85 484.80 L 694.85 484.02 C 698.64 483.35 702.75 481.68 706.98 479.34 L 706.98 413.81 C 706.98 409.58 704.98 408.25 701.20 408.25 C 694.19 408.25 688.85 416.70 686.96 434.39 L 686.07 434.39 L 686.07 406.91 Z M 766.50 484.80 Z M 849.40 420.26 L 849.40 479.46 C 853.18 481.79 856.63 483.35 859.85 484.02 L 859.85 484.80 L 832.60 484.80 L 832.60 484.02 C 835.82 483.35 839.38 481.79 843.05 479.57 L 843.05 422.60 C 843.05 414.36 838.16 411.47 831.93 411.47 C 826.36 411.47 821.47 413.14 816.35 418.37 C 816.46 418.92 816.46 419.59 816.46 420.26 L 816.46 479.46 C 820.25 481.79 823.69 483.35 826.92 484.02 L 826.92 484.80 L 799.66 484.80 L 799.66 484.02 C 802.89 483.35 806.45 481.79 810.12 479.57 L 810.12 422.60 C 810.12 414.36 805.22 411.47 798.99 411.47 C 793.32 411.47 788.53 413.14 783.30 418.48 L 783.30 479.46 C 786.98 481.79 790.53 483.35 793.76 484.02 L 793.76 484.80 L 766.50 484.80 L 766.50 484.02 C 769.73 483.35 773.29 481.79 776.96 479.46 L 776.96 412.25 C 773.29 409.91 769.73 408.35 766.50 407.69 L 766.50 406.91 L 783.30 406.91 L 783.30 417.15 C 786.31 413.25 795.54 405.35 803.78 405.35 C 811.67 405.35 815.46 410.14 816.24 417.03 C 819.24 413.25 828.48 405.35 836.71 405.35 C 845.73 405.35 849.40 411.58 849.40 420.26 Z M 858.21 484.80 Z M 902.05 486.35 C 879.02 486.35 861.55 469 861.55 445.74 C 861.55 422.71 879.02 405.35 902.05 405.35 C 925.19 405.35 942.66 422.71 942.66 445.74 C 942.66 469 925.19 486.35 902.05 486.35 Z M 907.28 483.80 C 924.64 483.80 936.32 470.66 936.32 452.08 C 936.32 428.83 919.19 407.91 896.82 407.91 C 879.57 407.91 867.89 421.04 867.89 439.51 C 867.89 462.43 885.03 483.80 907.28 483.80 Z M 944.38 484.80 Z M 994.33 420.26 L 994.33 479.46 C 998.12 481.79 1001.57 483.35 1004.80 484.02 L 1004.80 484.80 L 977.53 484.80 L 977.53 484.02 C 980.76 483.35 984.32 481.79 988 479.57 L 988 422.60 C 988 414.36 983.10 411.47 976.87 411.47 C 971.19 411.47 966.41 413.14 961.18 418.48 L 961.18 479.46 C 964.85 481.79 968.41 483.35 971.64 484.02 L 971.64 484.80 L 944.38 484.80 L 944.38 484.02 C 947.60 483.35 951.16 481.79 954.83 479.46 L 954.83 412.25 C 951.16 409.91 947.60 408.35 944.38 407.69 L 944.38 406.91 L 961.18 406.91 L 961.18 417.15 C 964.18 413.25 973.42 405.35 981.65 405.35 C 990.66 405.35 994.33 411.58 994.33 420.26 Z M 1002.62 484.80 Z M 1081.39 453.53 L 1082.28 453.53 C 1083.07 470.55 1069.38 486.35 1046.68 486.35 C 1023.20 486.35 1005.96 469 1005.96 445.74 C 1005.96 422.71 1023.42 405.35 1046.46 405.35 C 1062.59 405.35 1077.50 414.03 1077.50 427.60 C 1077.50 437.40 1069.49 444.85 1060.92 444.85 C 1041.78 444.85 1041.12 417.48 1025.21 417.48 C 1021.98 417.48 1019.42 418.48 1016.86 421.15 C 1013.97 426.16 1012.52 432.50 1012.52 439.51 C 1012.52 461.43 1027.87 481.35 1050.46 481.35 C 1068.26 481.35 1081.39 468.89 1081.39 453.53 Z M 1040.67 408.80 C 1030.88 408.80 1023.65 412.25 1018.98 418.15 C 1021.53 416.59 1023.42 416.03 1026.21 416.03 C 1042.01 416.03 1047.68 439.96 1067.15 439.96 C 1072.38 439.96 1074.5 436.84 1074.5 431.83 C 1074.5 421.71 1057.25 408.80 1040.67 408.80 Z M 1084.00 484.80 Z M 1135.52 406.91 L 1135.52 434.39 L 1134.63 434.39 C 1132.74 416.70 1127.40 408.25 1120.39 408.25 C 1116.60 408.25 1114.60 409.58 1114.60 413.81 L 1114.60 479.34 C 1118.83 481.68 1122.95 483.35 1126.73 484.02 L 1126.73 484.80 L 1096.13 484.80 L 1096.13 484.02 C 1099.92 483.35 1104.03 481.68 1108.26 479.34 L 1108.26 413.81 C 1108.26 409.58 1106.26 408.25 1102.48 408.25 C 1095.46 408.25 1090.12 416.70 1088.23 434.39 L 1087.34 434.39 L 1087.34 406.91 Z M 1135.52 406.91 ",xe=(t,s={})=>new q({transparent:!0,depthWrite:!1,toneMapped:!1,side:ie,uniforms:{map:{value:t},opacity:{value:0},dissolve:{value:0},time:{value:0},wobble:{value:s.wobble||0},light:{value:new N(-9,-9,0)},aspect:{value:s.aspect||4},stirW:{value:0},reveal:{value:1}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform sampler2D map;uniform float opacity;uniform float dissolve;uniform float time;uniform float wobble;uniform vec3 light;uniform float aspect;uniform float stirW;uniform float reveal;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  float fb(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.02+vec2(1.7,9.2);a*=.5;}return v;}
  void main(){vec2 uv=vUv;uv.x+=sin(uv.y*38.+time*1.7)*.004*wobble;uv.y+=sin(uv.x*22.+time*1.3)*.006*wobble;
   {vec2 d=(uv-light.xy)*vec2(aspect,1.);float r=length(d);float lens=exp(-r*r*9.)*light.z;uv-=d/vec2(aspect,1.)*lens*.07;uv.y+=sin(uv.x*aspect*9.-time*3.)*.004*lens;}
   vec4 c=texture2D(map,uv);float grain=n(vUv*vec2(46.,12.))*.65+n(vUv*vec2(140.,36.))*.35;
   float edge=dissolve*1.25-.12;float keep=smoothstep(edge,edge+.025,grain);float rim=smoothstep(edge+.16,edge+.02,grain)*step(.001,dissolve);
   float burn=step(.001,dissolve);float dz=grain-edge;/* burning paper: a charred black band runs ahead of the hole, cataract-yellow scorch ahead of that, an ember line at the edge */
   vec3 col=mix(vec3(1.7),vec3(1.35,1.02,.38)*1.25,burn*max(1.-smoothstep(.15,.75,dz),smoothstep(.0,.12,dissolve)));
   col=mix(col,vec3(.012,.008,.006),burn*max(1.-smoothstep(.0,.5,dz),smoothstep(.12,.45,dissolve)));
   col+=vec3(1.,.42,.1)*2.2*burn*(1.-smoothstep(0.,.03,dz));/* burning paper: white, then cataract-yellow, charring to black with an ember edge *//* crumbling words turn the warm yellow of the cataract *//* letters are pure white: ignoring the texture rgb kills the dark filtering halos */
   float rv=fb(vUv*vec2(aspect*1.3,2.)*1.4+3.)*.55+(1.-length((vUv-vec2(.5,.55))*vec2(1.,1.5)))*.45;float th=1.-reveal*1.12;float keepR=smoothstep(th,th+.05,rv);float rimR=smoothstep(th+.09,th+.005,rv)*keepR*step(reveal,.995);col+=vec3(1.,.9,.72)*rimR*1.4;
   // cursor light: a soft spot + a pearly band that follows the mouse across the letters
   vec2 dl=(vUv-light.xy)*vec2(aspect,1.);float spot=exp(-dot(dl,dl)*7.)*light.z;
   float band=exp(-pow((vUv.x-light.x)*aspect*1.6+(vUv.y-light.y)*.9,2.)*3.)*light.z;
   vec3 pearl=.5+.5*cos(6.2831*(vUv.x*1.3+vUv.y*.6+time*.05+vec3(0.,.33,.67)));
   
   // liquid: a fast stroke stirs the ink \u2014 a domain-warped vortex of violet / magenta / blue inside the letters, fading as it settles
   if(false&&stirW>.003){vec2 p=(vUv-light.xy)*vec2(aspect,1.);float r=length(p);float sw=stirW*exp(-r*r*.9);
    float ang=(2.6/(.35+r*r*3.))*stirW+time*.35;p=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*p;
    vec2 q=vec2(fb(p*3.+time*.12),fb(p*3.+vec2(5.2,1.3)-time*.1));float f=fb(p*2.6+q*4.+vec2(time*.18,-time*.14));
    // marbled paint: hard-edged bands of colour, like inks being stirred together (no soft gradient)
    float bands=fract(f*5.+q.x*2.);float id=floor(f*5.+q.x*2.);float hv=fract(sin(id*91.3)*437.5);
    vec3 ink=hv<.33?vec3(.45,.16,.95):hv<.66?vec3(.95,.25,.6):vec3(.25,.45,1.);
    float edge=smoothstep(.0,.04,bands)*smoothstep(1.,.96,bands);float mask=step(.55,fract(f*3.1+q.y*1.7))*edge;
    col=mix(col,ink*1.6,mask*smoothstep(.25,.6,sw));}float a=c.a*opacity*keep*keepR;if(a<.004)discard;gl_FragColor=vec4(col,a);}`}),lt=(t,s=2048,u=512)=>{let g=document.createElement("canvas");g.width=s,g.height=u;let c=g.getContext("2d");t(c,s,u);let w=new rt(g);return w.colorSpace=Re,w.anisotropy=r.capabilities.getMaxAnisotropy(),w};try{await Promise.race([Promise.all([document.fonts.load('600 160px "Playfair Display"'),document.fonts.load('italic 160px "Quelia"'),document.fonts.load('300 40px "Manrope"')]),new Promise(t=>setTimeout(t,2500))])}catch{}let ct=[];{let t=lt((u,g,c)=>{let w=g/839;u.scale(w,w),u.translate(-297,-316),u.fillStyle="#FFFFFF",u.fill(new Path2D(Le))},2048,416),s=new G(new de(7.4,7.4*416/2048),xe(t,{aspect:2048/416}));s.position.set(0,.42+7.4*416/2048/2,-12),x.add(s),ct.push({mesh:s,z:-12,y:s.position.y,inFar:99,inNear:98,outFar:9,outNear:3.2})}(window.MONET_HALL_TEXTS||[{z:-33,big:"LIGHT, NOT THINGS.",small:"Monet painted the air between him and the subject"},{z:-45,big:"ONE SUBJECT, EVERY HOUR.",small:"Haystacks \xB7 Poplars \xB7 Rouen \xB7 the Thames"},{z:-57,big:"HE BUILT HIS OWN MOTIF.",small:"Giverny \xB7 the pond, the bridge, the lilies"},{z:-68,big:"HIS SIGHT FADED. HE KEPT PAINTING.",small:"1914 \u2014 1926 \xB7 the Water Lilies"}]).forEach(t=>{let s=lt((w,F,U)=>{w.fillStyle="#FFFFFF",w.textAlign="center",w.textBaseline="alphabetic",w.letterSpacing="0px",w.font='600 100px "Playfair Display", Georgia, serif';let Y=t.big.split(" "),J=1,j=1e9;for(let f=1;f<Y.length;f++){let M=Math.abs(Y.slice(0,f).join(" ").length-Y.slice(f).join(" ").length);M<j&&(j=M,J=f)}let oe=Y.slice(0,J).join(" "),o=Y.slice(J).join(" "),i=Math.min(170,Math.floor(100*(F*.86)/Math.max(w.measureText(oe).width,w.measureText(o).width)));w.font=`600 ${i}px "Playfair Display", Georgia, serif`,w.fillText(oe,F/2,480-i*1.12),w.fillText(o,F/2,480),w.font='600 48px "Playfair Display", Georgia, serif',w.globalAlpha=1;let p=t.small;w.fillText(p,F/2,610)},2048,768),u=11.9,g=u*768/2048,c=new G(new de(u,g),xe(s,{aspect:2048/768}));innerWidth<innerHeight&&c.scale.setScalar(.7),c.position.set(0,-.35+g/2*(innerWidth<innerHeight?.7:1),t.z),x.add(c),ct.push({mesh:c,z:t.z,y:-.35+g/2*(innerWidth<innerHeight?.7:1),inFar:14,inNear:8.2,outFar:6.6,outNear:3.2})});let Xe=-1,he=(t,s,u)=>{let g=Math.min(1,Math.max(0,(t-s)/(u-s)));return g*g*(3-2*g)},dt=-79.7,_e=-72.9,He=new G(new de(9.3,10.6),new q({transparent:!0,depthWrite:!1,toneMapped:!1,side:ie,uniforms:{time:{value:0},open:{value:0},map:{value:null},flash:{value:0}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform float time;uniform float open;uniform sampler2D map;uniform float flash;varying vec2 vUv;
  float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
  float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=n(p)*a;p=p*2.03+1.7;a*=.5;}return v;}
  void main(){float x=(vUv.x-.5)*9.3,y=4.5+(vUv.y-.5)*10.6;
   float ad=y<5.2?abs(x)-4.03:length(vec2(x,y-5.2))-4.03; if(ad>0.)discard;
   vec2 c=vec2(x,y-3.4);float r=length(c/vec2(3.6,4.2));float an=atan(c.y,c.x);
   float f=fbm(vec2(x,y)*.55+vec2(time*.05,-time*.04));
   float ang=r*2.6-time*.14;vec2 rc=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*c;float sw=fbm(rc*.55+f*1.5+vec2(0.,-time*.05));
   vec2 uv=vec2(.5+x/11.+(f-.5)*.06+(sw-.5)*.05,.5+(y-3.2)/7.+(sw-.5)*.05);
   uv=1.-abs(1.-mod(uv,2.));vec3 lil=texture2D(map,uv).rgb;lil=pow(lil,vec3(2.2));
   // the Water Lilies themselves, slowly stirred: muted sage, grey-lavender and pale oil tones taken from the panel
   lil=pow(lil,vec3(.9))*1.35;vec3 col=mix(vec3(.05,.06,.05),lil,smoothstep(1.6,.2,r));
   vec3 tint=mix(vec3(.29,.33,.27),vec3(.45,.44,.48),smoothstep(.3,.75,sw));tint=mix(tint,vec3(.59,.58,.58),smoothstep(.6,.95,f)*.6);
   col=mix(col,col*.75+tint*.3,.06*smoothstep(1.2,.2,r));
   col+=vec3(.95,.9,.8)*exp(-r*r*9.)*(.012+.02*f);
   col+=vec3(.92,.92,.88)*exp(ad*7.)*.025;col+=vec3(1.,.95,.82)*flash*(.35+.9*exp(ad*3.));   // soft white glow just inside the arch edge
   float R=open*1.7, rr=r+(f-.5)*.35;
   float a=smoothstep(R-.06,R+.02,rr);if(open<.001)a=1.;
   col+=vec3(1.,.8,.5)*exp(-abs(rr-R)*22.)*step(.001,open)*(1.-open)*3.;
   a=max(a,exp(-abs(rr-R)*22.)*step(.001,open)*(1.-open));
   gl_FragColor=vec4(col,a);}`}));He.position.set(0,4.5,_e),He.renderOrder=-5,x.add(He);let Kt=(()=>{let t=new Ye;t.position.set(0,.03,dt+.1),x.add(t);let s=256,u=512,g=document.createElement("canvas");g.width=s,g.height=u;let c=g.getContext("2d"),w=c.createLinearGradient(0,u,0,0);w.addColorStop(0,"#fffaf2"),w.addColorStop(.3,"#fde8ee"),w.addColorStop(.68,"#f3a2c3"),w.addColorStop(1,"#cf4a85"),c.fillStyle=w,c.fillRect(0,0,s,u);let F=document.createElement("canvas");F.width=s,F.height=u;let U=F.getContext("2d");U.fillStyle="#808080",U.fillRect(0,0,s,u);for(let d=0;d<26;d++){let S=s/2+(d-12.5)*3.2,P=s/2+(d-12.5)*8.6,L=()=>{c.beginPath(),c.moveTo(s/2+(d-12.5)*1.2,u),c.bezierCurveTo(S,u*.62,P,u*.3,s/2+(d-12.5)*6.5,u*.04)};c.globalAlpha=.1+Math.random()*.08,c.strokeStyle=d%2?"#ffffff":"#e3809f",c.lineWidth=1.2+Math.random()*1.4,L(),c.stroke(),U.globalAlpha=.55,U.strokeStyle="#d8d8d8",U.lineWidth=2.4+Math.random()*1.5,U.beginPath(),U.moveTo(s/2+(d-12.5)*1.2,u),U.bezierCurveTo(S,u*.62,P,u*.3,s/2+(d-12.5)*6.5,u*.04),U.stroke()}c.globalAlpha=.3;let Y=c.createLinearGradient(0,0,s,0);Y.addColorStop(0,"rgba(160,40,90,.8)"),Y.addColorStop(.2,"rgba(0,0,0,0)"),Y.addColorStop(.8,"rgba(0,0,0,0)"),Y.addColorStop(1,"rgba(160,40,90,.8)"),c.fillStyle=Y,c.fillRect(0,0,s,u);let J=U.getImageData(0,0,s,u).data,j=document.createElement("canvas");j.width=s,j.height=u;let oe=j.getContext("2d"),o=oe.createImageData(s,u);for(let d=0;d<u;d++)for(let S=0;S<s;S++){let P=(Ve,De)=>J[(Math.min(u-1,Math.max(0,De))*s+Math.min(s-1,Math.max(0,Ve)))*4]/255,L=(P(S+1,d)-P(S-1,d))*2.2,ee=(P(S,d+1)-P(S,d-1))*2.2,ge=Math.hypot(L,ee,1),ve=(d*s+S)*4;o.data[ve]=(-L/ge*.5+.5)*255,o.data[ve+1]=(ee/ge*.5+.5)*255,o.data[ve+2]=(1/ge*.5+.5)*255,o.data[ve+3]=255}oe.putImageData(o,0,0);let i=new rt(g);i.colorSpace=Re,i.anisotropy=8;let p=new rt(j);p.anisotropy=8;let f=new Zt({map:i,normalMap:p,normalScale:new we(.9,.9),emissiveMap:i,emissive:16777215,emissiveIntensity:.08,roughness:.42,sheen:1,sheenColor:new V(16765924),sheenRoughness:.45,clearcoat:.35,clearcoatRoughness:.35,side:ie}),M=(d,S,P)=>{let L=new de(1,1,18,44),ee=L.attributes.position,ge=L.attributes.uv;for(let ve=0;ve<ee.count;ve++){let Ve=ee.getX(ve)*2,De=ee.getY(ve)+.5,We=Math.pow(Math.sin(Math.PI*Math.min(1,De*.97+.03)),.75)*(1-.32*De*De)*S;ee.setXYZ(ve,Ve*We,De*d,P*(1-Ve*Ve)*We*.9+Math.sin(De*Math.PI*.9)*.05*d),ge.setXY(ve,Ve*.5+.5,De)}return L.computeVertexNormals(),L},y=[{n:9,L:.95,W:.2,cup:.5,open:1.42,y:0,d:0},{n:9,L:.86,W:.18,cup:.6,open:1.08,y:.03,d:.18},{n:8,L:.74,W:.16,cup:.7,open:.7,y:.06,d:.36},{n:6,L:.58,W:.14,cup:.8,open:.36,y:.09,d:.52}],h=[];y.forEach((d,S)=>{let P=M(d.L,d.W,d.cup);for(let L=0;L<d.n;L++){let ee=new Ye;ee.rotation.y=L/d.n*Math.PI*2+S*.35,ee.position.y=d.y;let ge=new G(P,f);ge.position.z=.075-S*.022,ee.add(ge),t.add(ee),h.push({m:ge,r:d,ri:S,j:L%3*.03})}});let a=new Ye;t.add(a);let n=new Zt({color:16761402,emissive:16753178,emissiveIntensity:.6,roughness:.45,sheen:.6,sheenColor:new V(16773280)}),B=new It(.006,.011,.16,10,4),X=new qt(.014,12,8);for(let d=0;d<64;d++){let S=d*2.399,P=.025+.13*Math.sqrt(d/64),L=new G(B,n);L.position.set(Math.cos(S)*P,.12,Math.sin(S)*P),L.rotation.set(Math.sin(S)*P*3,0,-Math.cos(S)*P*3);let ee=new G(X,n);ee.position.y=.085,ee.scale.set(1,1.6,1),L.add(ee),a.add(L)}let b=new Qe(16774376,0,7,1.4);b.position.set(.8,1.6,1.4),t.add(b);let z=null,C=new Qe(16751304,0,9,1.6);C.position.set(0,.9,0),t.add(C);let v=new G(new de(6,6),new q({transparent:!0,depthWrite:!1,depthTest:!1,blending:at,uniforms:{k:{value:0}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:"uniform float k;varying vec2 vUv;void main(){float r=length(vUv-.5)*2.;gl_FragColor=vec4(vec3(1.,.62,.8)*exp(-r*r*7.)*k*.1,1.);}"}));v.position.y=.55,t.add(v),m.loadAsync("assets/lily-pad.webp").then(d=>{d.colorSpace=Re;let S=new G(new de(2.6,2.6).rotateX(-Math.PI/2),new ze({map:d,alphaTest:.5,roughness:.35,color:10134930}));S.position.set(0,.01,dt+.1),x.add(S),z=S}).catch(()=>{}),t.visible=!1;let D=N,A=new N(0,.03,dt+.1),ne=new N,I=new N,O=new N;return{g:t,update(d,S,P,L=0,ee=!1){t.visible=ee&&P.position.z<-70;let ge=Math.sin(S*1.3)*.015;P.getWorldDirection(I),O.set(0,1,0);let ve=L*L*(3-2*L),Ve=new D().crossVectors(I,O).normalize(),De=new D().crossVectors(Ve,I).normalize();ne.copy(P.position).addScaledVector(I,2.3).addScaledVector(De,-2.4+1.95*ve+Math.sin(S*.9)*.03*ve),t.position.copy(ne),t.quaternion.copy(P.quaternion),t.rotateX(.42),t.rotateY(S*.12),h.forEach(We=>{let kt=le.clamp((d-We.r.d*.7-We.j)/(1-We.r.d*.7),0,1),lo=kt*kt*(3-2*kt),co=.07+(3-We.ri)*.11;We.m.rotation.x=co+(We.r.open-co)*lo+ge*lo}),a.scale.setScalar(.4+.6*he(d,.35,.8)),f.emissiveIntensity=.05+d*.18,n.emissiveIntensity=.4+d*1.6,C.intensity=d*d*14,b.intensity=(.3+d)*10,v.material.uniforms.k.value=d,v.lookAt(P.position),t.scale.setScalar(1.15*Math.min(1,.25+P.aspect*.75))}}})(),Ie=new Qe(16757866,140,18,1.4);Ie.position.set(0,6.2,dt),x.add(Ie);let qe=new Ye;qe.position.set(0,0,dt),qe.visible=!1,x.add(qe);let Qt=[],bt=[];T.forEach(t=>{bt.find(s=>s.mesh.material.map===t.mesh.material.map)||bt.push(t)});let Ho=new ze({color:9398838,metalness:.9,roughness:.35,emissive:3810568,emissiveIntensity:.45}),Jt=[...bt,...bt].slice(0,7);Jt.forEach((t,s)=>{let g=Math.min(1.9,1.15*(t.width/t.height)),c=new Ye,w=new G(new de(g,1.15),new Fe({map:t.mesh.material.map,toneMapped:!1,transparent:!0,opacity:0,fog:!1}));w.position.z=.035,c.add(w);let F=new G(new Ke(g+.1,1.15+.1,.06),Ho);c.add(F),c.userData.frame=F,c.userData.pic=w,qe.add(c),Qt.push({g:c,phase:s/Jt.length*Math.PI*2,lift:s%3*.35,speed:.07+s%2*.02})}),He.material.uniforms.map.value=l,l.wrapS=l.wrapT=bo,l.needsUpdate=!0;let _t=[];x.traverse(t=>{t.isMesh&&t.material&&t.material.map===l&&_t.push(t.material)});let Ft=0,$t=[],ko=new Dt(.28,24,.18,Math.PI*2-.36),Vo=new ze({color:5400904,roughness:.45,side:ie}),jo=new qt(1,8,5),Xo=new ze({color:15453142,roughness:.65});for(let t=0;t<0;t++){let s=new Ye,u=new G(ko,Vo);if(u.rotation.x=-Math.PI/2,s.add(u),t%3===0)for(let g=0;g<9;g++){let c=new G(jo,Xo);c.scale.set(.045,.025,.13),c.position.set(Math.sin(g*7)*.09,.06,Math.cos(g*7)*.09),c.rotation.set(-.5,g*7,0),s.add(c)}s.position.set(Math.sin(t*2.399)*3.1,.07,-5-t*2.6),s.userData.home=s.position.clone(),x.add(s),$t.push(s)}let Nt=R?90:220,Gt=new ut,yt=new Float32Array(Nt*3),eo=new Float32Array(Nt);for(let t=0;t<Nt;t++){let s=Math.random;yt[t*3]=(s()*2-1)*5.4,yt[t*3+1]=.4+s()*6.6,yt[t*3+2]=-s()*80+2,eo[t]=s()}Gt.setAttribute("position",new Xt(yt,3)),Gt.setAttribute("seed",new Xt(eo,1));let $e=new Po(Gt,new q({transparent:!0,depthWrite:!1,blending:at,uniforms:{time:{value:0},opacity:{value:.9},scale:{value:(window.__lvh?window.__lvh():innerHeight)*r.getPixelRatio()},tint:{value:new V(16773600)}},vertexShader:`attribute float seed;uniform float time;uniform float scale;varying float vSeed;varying float vBlur;varying float vFade;
  void main(){vec3 p=position;float t=time*(.04+seed*.05);
   p.x+=sin(t*2.1+seed*40.)*.35;p.y+=sin(t*1.3+seed*17.)*.45+mod(time*.02*(.3+seed),1.)*.0;p.z+=cos(t*1.7+seed*23.)*.35;
   vec4 mv=modelViewMatrix*vec4(p,1.);float d=-mv.z;
   // near flakes: big and soft (bokeh); far flakes: small and crisp
   vBlur=clamp(1.-d/5.5,0.,1.);vFade=smoothstep(1.6,3.2,d)*(1.-smoothstep(26.,40.,d));vSeed=seed;
   float size=(.014+seed*.022)*(1.+vBlur*1.4);gl_PointSize=min(size*scale/d,6.);gl_Position=projectionMatrix*mv;}`,fragmentShader:`uniform float time;uniform float opacity;uniform vec3 tint;varying float vSeed;varying float vBlur;varying float vFade;
  void main(){vec2 c=gl_PointCoord-.5;
   // slightly elongated, rotating flake
   float a=vSeed*6.28+time*(.2+vSeed*.3);mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a));c=R*c;c.x*=1.+vSeed*.9;
   float r=length(c)*2.;float core=smoothstep(1.,.15,r);float soft=smoothstep(1.,0.,r);float disc=mix(core,soft*.55,vBlur);
   float twinkle=.55+.45*pow(.5+.5*sin(time*(.6+vSeed*1.7)+vSeed*50.),6.);
   float alpha=disc*twinkle*opacity*vFade*(1.-vBlur*.55);if(alpha<.003)discard;gl_FragColor=vec4(tint*(1.2+twinkle*.6),alpha);}`}));x.add($e),Ue.push($e);let ea=[],ta=(()=>{let t=document.createElement("canvas");t.width=t.height=256;let s=t.getContext("2d"),u=s.createRadialGradient(128,70,4,128,120,150);u.addColorStop(0,"rgba(255,214,168,1)"),u.addColorStop(.35,"rgba(255,186,130,.55)"),u.addColorStop(1,"rgba(255,170,110,0)"),s.fillStyle=u,s.fillRect(0,0,256,256);let g=new rt(t);return g.colorSpace=Re,g})();T.forEach(t=>{t.mesh.material.toneMapped=!1});let to=r.capabilities.isWebGL2?R?2:4:0,Te=new Et(r,new ye(innerWidth*r.getPixelRatio(),(window.__lvh?window.__lvh():innerHeight)*r.getPixelRatio(),{type:be,samples:to}));Te.addPass(new Ut(x,e));let Mt=new Rt(x,e,{focus:4,aperture:2e-5,maxblur:.007});Mt.enabled=!1,R||Te.addPass(Mt),Te.addPass(new Wt);let et=new st({uniforms:{tDiffuse:{value:null},time:{value:0},amount:{value:0},cata:{value:0},blk:{value:0},res:{value:new we(innerWidth,innerHeight)}},vertexShader:"varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",fragmentShader:`uniform sampler2D tDiffuse;uniform float time;uniform float amount;uniform float cata;uniform float blk;uniform vec2 res;varying vec2 vUv;
  float h12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
  void main(){vec2 c=vUv-.5;float r2=dot(c,c);vec2 uv=.5+c*(1.-(.012+amount*.06)*r2);
   vec2 dir=normalize(c+vec2(.0001))*(.3+length(c));float edge=smoothstep(.12,.28,r2);float ca=(.0005*edge+amount*.0012)*edge;
   vec3 col=vec3(texture2D(tDiffuse,uv+dir*ca).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-dir*ca).b);
   float band=0.;
   if(band>.01){vec3 acc=col;for(int i=0;i<6;i++){float a=float(i)*1.0472+.5;acc+=texture2D(tDiffuse,uv+vec2(cos(a),sin(a))*band*3.5/res).rgb;}col=mix(col,acc/7.,band);}
   
   col=mix(vec3(.012,.01,.018),vec3(1.),col);
   if(cata>.002){vec3 b=vec3(0.);float R=.012*cata;for(int i=0;i<8;i++){float a=float(i)*.785+.4;b+=texture2D(tDiffuse,uv+vec2(cos(a),sin(a))*R*vec2(.6,1.)).rgb+texture2D(tDiffuse,uv+vec2(cos(a),sin(a))*R*.45).rgb;}b/=16.;
    col=mix(col,b,cata*.9);float l=dot(col,vec3(.3,.59,.11));col=mix(col,l*vec3(1.22,.98,.58)+vec3(.035,.02,0.),cata*.82);col*=1.-cata*.12;}
   col*=1.-.12*pow(length(c)*1.25,2.);
   { /* soft chaotic film grain: smooth value noise in ~2.6 px cells, fresh random offset 18x a second, barely there */
    float t=floor(time*18.);vec2 q=gl_FragCoord.xy/1.35+vec2(h12(vec2(t,1.7)),h12(vec2(3.1,t)))*517.;vec2 i=floor(q),f=fract(q);f=smoothstep(.2,.8,f);
    float g=mix(mix(h12(i),h12(i+vec2(1,0)),f.x),mix(h12(i+vec2(0,1)),h12(i+vec2(1,1)),f.x),f.y)-.5;float lum=dot(col,vec3(.3,.59,.11));col+=g*(.012-.006*smoothstep(.1,.6,lum));}
   col*=1.-blk;
   
   gl_FragColor=vec4(col,1.);}`});Te.addPass(et);let Io=new Ot;!R&&!to&&Te.addPass(Io);let oo=et,qo=et,ao={setSize(){}},io=0,Ht=0,se=new N(1e3,0,1e3),Zo=0,ro=0,ft=0,so=0,no=0,tt=new N(1e3,0,1e3);window.__curDbg=()=>[se.x,se.z,tt.x];let Ct=new Fo,Ze=new we,Yo=new Lt(new N(0,1,0),-.025);addEventListener("pointermove",t=>{if(t.pointerType==="touch")return;let s=Math.hypot(t.clientX-so,t.clientY-no);so=t.clientX,no=t.clientY,ft=Math.min(1,ft+s*.004),Ze.set(t.clientX/innerWidth*2-1,-t.clientY/innerHeight*2+1),Ct.setFromCamera(Ze,e);let u=Ct.ray.intersectPlane(Yo,new N),g,c;u&&u.z<e.position.z-1.2&&u.z>e.position.z-40?(g=u.x,c=u.z,se.copy(u)):(g=Ze.x*3.2,c=e.position.z-5.5-Math.max(0,Ze.y+.2)*6,se.set(1e3,0,1e3)),g=le.clamp(g,-3.7,3.7);let w=c<-.5&&c>-72.3,F=performance.now()/1e3;w&&F-ro>.05&&s>1&&(Ee[Zo++%Ce].set(g,c,F,Math.min(2.2,.7+s*.05)),ro=F)}),addEventListener("resize",()=>{qo.uniforms.res.value.set(innerWidth,innerHeight),$e.material.uniforms.scale.value=(window.__lvh?window.__lvh():innerHeight)*r.getPixelRatio(),Te.setPixelRatio(r.getPixelRatio()),Te.setSize(innerWidth,window.__lvh?window.__lvh():innerHeight),Z.getRenderTarget().setSize(...re()),W&&W.forEach(t=>t.setSize(...re())),me=!0,te=!1,ao.setSize(innerWidth/2,innerHeight/2)});let ke=null,Ko=[],ot=document.createElement("button");ot.id="sound",ot.textContent="\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A",ot.style.cssText="position:fixed;right:24px;top:22px;width:auto;color:#ddd;background:#292c3288;padding:9px 14px;border-radius:3px;z-index:5",document.body.append(ot),ot.onclick=async()=>{if(ke)ke.state==="running"?await ke.suspend():await ke.resume();else{let t=new AudioContext,s=t.createGain();s.gain.value=.025,s.connect(t.destination);let u=t.createBuffer(1,t.sampleRate*3,t.sampleRate),g=u.getChannelData(0),c=0;for(let U=0;U<g.length;U++)c=(c+(Math.random()*2-1)*.04)/1.04,g[U]=c;let w=t.createBufferSource();w.buffer=u,w.loop=!0;let F=t.createBiquadFilter();F.type="lowpass",F.frequency.value=650,w.connect(F),F.connect(s),w.start(),ke=t,T.forEach((U,Y)=>{let J=t.createBufferSource();J.buffer=u,J.loop=!0,J.playbackRate.value=.6+Y*.12;let j=t.createBiquadFilter();j.type="bandpass",j.frequency.value=250+Y*180,j.Q.value=.5;let oe=t.createGain();oe.gain.value=.008;let o=t.createPanner();o.panningModel="HRTF",o.distanceModel="inverse",o.refDistance=2,o.maxDistance=16,o.rolloffFactor=1.8,o.positionX.value=U.side*5.9,o.positionY.value=2.65,o.positionZ.value=U.z,J.connect(j),j.connect(oe),oe.connect(o),o.connect(t.destination),J.start(),Ko.push(o)}),await t.resume()}ot.textContent=ke.state==="running"?"\u0412\u044B\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A":"\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0437\u0432\u0443\u043A"};let oa=new V;return{water:Z,composer:Te,resize:()=>{Z.getRenderTarget().setSize(...re()),W&&W.forEach(t=>t.setSize(...re())),me=!0,te=!1,ao.setSize(innerWidth/2,innerHeight/2)},update(t,s,u,g,c){let w=0;for(;w<4&&pe[w+1].at<=s;)w++;let F=pe[w],U=pe[w+1],Y=le.clamp((s-F.at)/(U.at-F.at),0,1),J=le.smoothstep(s,.65,.9);if(K.update(t,s,e),x.fog.color.set(1712180),x.fog.density=.02,x.background.setRGB(.002,.003,.006),ke?.state==="running"){let o=ke.listener,i=e.getWorldDirection(new N);o.positionX?(o.positionX.value=e.position.x,o.positionY.value=e.position.y,o.positionZ.value=e.position.z,o.forwardX.value=i.x,o.forwardY.value=i.y,o.forwardZ.value=i.z,o.upX.value=0,o.upY.value=1,o.upZ.value=0):(o.setPosition(e.position.x,e.position.y,e.position.z),o.setOrientation(i.x,i.y,i.z,0,1,0))}Z.material.uniforms.time.value=t;let j=0;{let o=e.position.z-_e;if(Ft=he(-o,-1.6,.7),He.material.uniforms.time.value=t,He.material.uniforms.open.value=Ft,window.__pFlash=Math.max(0,(window.__pFlash||0)-c*1.6),He.material.uniforms.flash.value=Math.min(1.5,window.__pFlash),He.visible=Ft<.999,qe.visible=e.position.z<_e+10,Ie.visible=e.position.z<-58,qe.visible||(j=0,Kt.update(0,t,e,0),document.body.style.setProperty("--fblack","0"),window.__hall&&(window.__hall.U.uFin.value=0),document.body.dataset.fin="",document.body.dataset.lilytext="",document.body.dataset.end="",window.__hall&&window.__hall.update(t,0),Ie.intensity=140,k.intensity=.11,x.environmentIntensity=.1,K.skyLight.intensity=.9,K.archGlow.intensity=70,K.sky.material.uniforms.twilightStrength.value=1),qe.visible){let i=he(-(e.position.z-_e),.05,1);Qt.forEach((n,B)=>{n.g.visible=!1});let p=i;window.__hall&&window.__hall.update(t,p),Ie.intensity=140*(1-p*.8),K.skyLight.intensity=.9*(1-p),K.archGlow.intensity=70*(1-p*.7),K.sky.material.uniforms.twilightStrength.value=1-p*.85,k.intensity=.11*(1-p*.6),x.environmentIntensity=.1*(1-p*.6),x.traverseVisible,x.fog.color.multiplyScalar(1-p*.5),x.background.setRGB(.002,.003,.006);let f=(n=>n<.62?n/.62*.8:n<.93?.8+(n-.62)/.31*.155:.955+(n-.93)/.07*.045)(window.__finP||0);{let n=window.__tailV??0;window.__tailV=window.__finOverride!=null?f:le.damp(n,f,5,Math.min(.05,c))}let M=window.__tailV,y=Math.max(he(-e.position.z,73.2,75)*.85,he(M,0,.22)),h=1-he(M,.6,.8),a=he(M,.36,.58);Kt.update(h,t,e,a,M>.34),document.body.style.setProperty("--fblack",(he(M,.78,.96)*.35).toFixed(3)),window.__hall&&(window.__hall.U.uFin.value=Math.max(y*.8,h)),j=Math.max(he(-(e.position.z-_e),-1.8,-.4)*(1-he(-(e.position.z-_e),.2,1.6))*.85,he(M,.64,.84)*.82),_t.forEach(n=>n.color.setScalar(.22+.98*y)),document.body.dataset.lilytext=M>.1&&M<.38?"1":"",document.body.dataset.fin="",document.body.dataset.end=M>=.81?"1":"",Ie.intensity*=.25+.75*y,Ie.color.setRGB(1,.72+.1*y,.45+.35*y)}}{let o=document.body.classList.contains("mui-walking");o&&Xe<0&&(Xe=t),o||(Xe=-1);let i=Xe<0?0:1-he(t-Xe,4.2,9.5);et.uniforms.blk.value=Xe<0?0:1-he(t-Xe,3.6,6);let p=window.__hoverMix||0,f=Math.sin(Math.PI*Math.min(1,p))*(window.__focusing?.55:.35);et.uniforms.cata.value=Math.max(j,i,f)}let oe=Math.min(1,e.aspect/1.5)*(e.aspect<1?1.45:1);Ct.setFromCamera(Ze,e),ct.forEach(o=>{if(o.mesh.visible){let h=Ct.intersectObject(o.mesh)[0],a=o.mesh.material.uniforms.light.value;h&&h.uv?(a.x=le.damp(a.x,h.uv.x,8,c),a.y=le.damp(a.y,h.uv.y,8,c),a.z=le.damp(a.z,1,5,c)):a.z=le.damp(a.z,0,3,c);{let n=o.mesh.material.uniforms.stirW;window.__stirTest?(n.value=1,a.set(.45,.5,1)):n.value=h&&h.uv?Math.min(.55,Math.max(n.value*Math.exp(-c*1.4),Math.max(0,ft-.35)*1.1)):n.value*Math.exp(-c*1.1)}}o.mesh.scale.setScalar(oe);let i=e.position.z-o.z,p=o.inFar>90?1:1-he(i,o.inNear,o.inFar),f=Math.min(1,Math.max(0,(o.outFar-i)/(o.outFar-o.outNear)));o.ov=o.ov??0,i<-9&&(o.ov=f),o.ov=f>o.ov?Math.min(f,o.ov+c/.55):Math.max(f,o.ov-c/.9);let M=o.ov*o.ov*(3-2*o.ov);o.mesh.position.z=o.inFar>90?o.z:Math.min(o.z,e.position.z-(o.outFar-o.ov*(o.outFar-o.outNear)));let y=o.mesh.material.uniforms;y.opacity.value=Math.min(1,p*7)*(1-M*.35),y.reveal.value=p,y.dissolve.value=M,y.time.value=t,o.mesh.visible=p>.002&&M<.999,o.flat||(o.mesh.position.y=o.y-(1-p)*(1-p)*.9,o.tx=le.damp(o.tx||0,Ze.x,2.6,c),o.ty=le.damp(o.ty||0,Ze.y,2.6,c),o.mesh.rotation.set(-o.ty*.07,o.tx*.12,0))});{let o=document.body.dataset.view==="painting"||(window.__hoverMix||0)>.04?0:1;window.__wGate=o?Math.min(1,(window.__wGate??1)+c/1.4):0}ct.forEach(o=>{window.__wGate<=0?o.mesh.visible=!1:window.__wGate<1&&(o.mesh.material.uniforms.opacity.value*=window.__wGate*window.__wGate)});{let o=!!document.querySelector(".mui-through");ct.forEach((i,p)=>{(i.inFar>90||document.body.dataset.titleStay==="1"||o&&p===0)&&(i.mesh.visible=!1)})}ft*=Math.exp(-c*1.8);{let o=Z.material.uniforms.uCur.value,i=window.__curTest||se.x<500?1:0;if(window.__curTest&&se.set(...window.__curTest),i){let p=1-Math.exp(-c*1.6);o.x+=(se.x-o.x)*p,o.z+=(se.z-o.z)*p}o.y+=((i?1:0)-o.y)*Math.min(1,c*1.5)}if(Z.material.uniforms.stir.value=ft,Z.material.uniforms.hazeColor.value.copy(x.fog.color),window.__lilyCards){let o=t;window.__lilyCards.lilyCards.forEach(i=>{i.rotation.y=Math.atan2(e.position.x-i.position.x,e.position.z-i.position.z),i.position.y=-.035+Math.sin(o*.7+i.userData.ph)*.01});{let i=Math.min(c,.05),p=se.x<999,f=p&&tt.x<999?(se.x-tt.x)/Math.max(i,.001):0,M=p&&tt.x<999?(se.z-tt.z)/Math.max(i,.001):0;tt.copy(se);let y=Math.min(6,Math.hypot(f,M)),h=window.__lilyCards.padCards;h.forEach(a=>{let n=a.userData,B=n.v;if(p){let b=a.position.x-se.x,z=a.position.z-se.z,C=Math.hypot(b,z),v=.55+.45*a.scale.x;if(C<v){let D=(1-C/v)*(1-C/v)*(1.2+y*1.4);B.x+=(b/(C+.001)*D+f*.18*(1-C/v))*i,B.y+=(z/(C+.001)*D+M*.18*(1-C/v))*i,n.av+=(b*M-z*f)*.06*(1-C/v)*i}}if(!n.gone){let z=Math.hypot(n.home.x-a.position.x,n.home.z-a.position.z)<1.5?.035:0;B.x+=(n.home.x-a.position.x)*z*i,B.y+=(n.home.z-a.position.z)*z*i}for(let b of h){if(b===a||b.userData.spot===n.spot)continue;let z=a.position.x-b.position.x,C=a.position.z-b.position.z,v=Math.hypot(z,C),D=(a.scale.x+b.scale.x)*.16;if(v<D&&v>1e-4){let A=(D-v)*.6*i;B.x+=z/v*A,B.y+=C/v*A}}let X=Math.exp(-i*1.1);if(B.multiplyScalar(X),n.av*=Math.exp(-i*1.4),a.position.x=Math.max(-3.65,Math.min(3.65,a.position.x+B.x*i)),a.position.z+=B.y*i,a.rotation.y+=n.av*i,a.position.y=a.userData.y0+Math.sin(o*.7+a.userData.ph)*.006,!n.gone&&a.position.z<-71.4&&Math.abs(a.position.x)<3.9&&(n.gone=o,n.s0=a.scale.x,window.__pFlash=Math.min(1.4,(window.__pFlash||0)+.9),window.__padsIn=(window.__padsIn||0)+1,window.__padsIn===h.length)){window.__pFlash=3;let b=document.createElement("div");b.textContent="Mọi thanh âm đã hội tụ.",b.style.cssText='position:fixed;left:50%;top:44%;transform:translate(-50%,-50%);z-index:9;font:italic 400 clamp(36px,5vw,72px)/1 "Quelia",Georgia,serif;color:#fcf4e9;text-shadow:0 0 40px rgb(255 230 180 / .8);opacity:0;transition:opacity 1.6s ease;pointer-events:none',document.body.append(b),requestAnimationFrame(()=>b.style.opacity="1"),setTimeout(()=>{b.style.opacity="0",setTimeout(()=>b.remove(),1800)},4200)}if(n.gone){let b=Math.min(1,(o-n.gone)/1.6),z=b*b;a.position.x+=(0-a.position.x)*z*.08,a.position.z+=(-73.2-a.position.z)*z*.06,a.rotation.y+=i*(2+6*z),a.scale.setScalar(n.s0*(1-z)),a.position.y-=z*.05,B.set(0,0),a.visible=b<1}}),window.__lilyCards.lilyCards.forEach(a=>{let n=a.userData.pad;n&&(a.position.x=n.position.x+a.userData.off.x,a.position.z=n.position.z+a.userData.off.y,a.visible=n.visible,n.userData.gone&&a.scale.setScalar(n.scale.x/n.userData.s0*(a.userData.s0||(a.userData.s0=a.scale.x))))})}}$t.forEach((o,i)=>{let p=o.userData.home,f=p.x-se.x,M=p.z-se.z,y=Math.hypot(f,M),h=Math.max(0,1-y/1.6)*.45;o.position.x=le.damp(o.position.x,p.x+f/(y+.01)*h,2,c),o.position.z=le.damp(o.position.z,p.z+M/(y+.01)*h,2,c),o.position.y=.065+Math.sin(t*.7+i)*.012,o.rotation.z=Math.sin(t*.65+i)*.025});{let o=performance.now()/1e3,i=Math.max(.001,o-(window.__lastPT||o-.016));window.__lastPT=o;let p=Math.abs(s-io)/i;io=s,Ht=le.damp(Ht,Math.min(1,p*9),6,c),oo.uniforms.amount.value=Ht,oo.uniforms.time.value=t}$e.material.uniforms.time.value=t,$e.material.uniforms.opacity.value=.35+.55*(1-J),$e.material.uniforms.tint.value.set(16773600).lerp(H.color,.35),et.uniforms.time.value=t,Mt.enabled=!R&&g,g&&(Mt.uniforms.focus.value=4)},render(){Te.render()},async warm(){try{let t=Te.readBuffer||Te.renderTarget1;r.setRenderTarget(t),await r.compileAsync(x,e),r.setRenderTarget(null),await r.compileAsync(x,e)}catch{r.setRenderTarget(null)}}}}export{_a as createEffects};
